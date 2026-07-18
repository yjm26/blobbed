/**
 * Blobbed container formats
 *
 * Legacy:  [iv 12][ciphertext…]
 * Chunked: [magic 6][chunkSize u32BE][numChunks u32BE]
 *          repeated: [iv 12][cipherLen u32BE][ciphertext…]
 *
 * Chunked enables progressive download/decrypt progress + future MSE segments.
 */

const MAGIC = new TextEncoder().encode('BBCH01');
const DEFAULT_CHUNK = 256 * 1024; // 256 KiB plaintext

export type EncFormat = 'legacy' | 'chunked';

export type ProgressFn = (p: {
  phase: 'encrypt' | 'download' | 'decrypt' | 'done';
  ratio: number; // 0..1
  detail?: string;
}) => void;

function toAB(u8: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}

function u32be(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, false);
  return b;
}

function readU32be(buf: Uint8Array, off: number): number {
  return new DataView(buf.buffer, buf.byteOffset + off, 4).getUint32(0, false);
}

export function isChunkedContainer(data: Uint8Array): boolean {
  if (data.length < 14) return false;
  for (let i = 0; i < MAGIC.length; i++) {
    if (data[i] !== MAGIC[i]) return false;
  }
  return true;
}

export async function importAesKey(
  key: Uint8Array,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toAB(key), { name: 'AES-GCM' }, false, usages);
}

/** Single-shot legacy encrypt (small files) */
export async function encryptLegacy(
  data: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await importAesKey(key, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, toAB(data))
  );
  const out = new Uint8Array(12 + encrypted.length);
  out.set(iv, 0);
  out.set(encrypted, 12);
  return out;
}

export async function decryptLegacy(
  container: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> {
  const iv = container.slice(0, 12);
  const ciphertext = container.slice(12);
  const cryptoKey = await importAesKey(key, ['decrypt']);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      toAB(ciphertext)
    )
  );
}

/**
 * Chunked AES-GCM container. Prefer for video / large files.
 */
export async function encryptChunked(
  data: Uint8Array,
  key: Uint8Array,
  opts?: { chunkSize?: number; onProgress?: ProgressFn }
): Promise<Uint8Array> {
  const chunkSize = opts?.chunkSize ?? DEFAULT_CHUNK;
  const onProgress = opts?.onProgress;
  const cryptoKey = await importAesKey(key, ['encrypt']);
  const numChunks = Math.max(1, Math.ceil(data.length / chunkSize) || 1);

  const parts: Uint8Array[] = [];
  parts.push(MAGIC);
  parts.push(u32be(chunkSize));
  parts.push(u32be(numChunks));

  let total = MAGIC.length + 8;

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    const slice = data.subarray(start, end);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, toAB(slice))
    );
    parts.push(iv);
    parts.push(u32be(cipher.length));
    parts.push(cipher);
    total += 12 + 4 + cipher.length;
    onProgress?.({
      phase: 'encrypt',
      ratio: (i + 1) / numChunks,
      detail: `Encrypt ${i + 1}/${numChunks}`,
    });
  }

  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export async function decryptChunked(
  container: Uint8Array,
  key: Uint8Array,
  opts?: { onProgress?: ProgressFn }
): Promise<Uint8Array> {
  if (!isChunkedContainer(container)) {
    throw new Error('Not a chunked container');
  }
  const onProgress = opts?.onProgress;
  const chunkSize = readU32be(container, 6);
  const numChunks = readU32be(container, 10);
  if (chunkSize < 1024 || chunkSize > 8 * 1024 * 1024) {
    throw new Error('Invalid chunk size');
  }
  if (numChunks < 1 || numChunks > 200_000) {
    throw new Error('Invalid chunk count');
  }

  const cryptoKey = await importAesKey(key, ['decrypt']);
  const plainParts: Uint8Array[] = [];
  let plainTotal = 0;
  let off = 14;

  for (let i = 0; i < numChunks; i++) {
    if (off + 16 > container.length) throw new Error('Truncated chunk header');
    const iv = container.subarray(off, off + 12);
    off += 12;
    const clen = readU32be(container, off);
    off += 4;
    if (off + clen > container.length) throw new Error('Truncated chunk body');
    const cipher = container.subarray(off, off + clen);
    off += clen;

    const plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        cryptoKey,
        toAB(cipher)
      )
    );
    plainParts.push(plain);
    plainTotal += plain.length;
    onProgress?.({
      phase: 'decrypt',
      ratio: (i + 1) / numChunks,
      detail: `Decrypt ${i + 1}/${numChunks}`,
    });
  }

  const out = new Uint8Array(plainTotal);
  let p = 0;
  for (const part of plainParts) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

/** Auto-detect container and decrypt */
export async function decryptContainer(
  container: Uint8Array,
  key: Uint8Array,
  opts?: { onProgress?: ProgressFn }
): Promise<Uint8Array> {
  if (isChunkedContainer(container)) {
    return decryptChunked(container, key, opts);
  }
  opts?.onProgress?.({ phase: 'decrypt', ratio: 0.15, detail: 'Decrypting…' });
  const plain = await decryptLegacy(container, key);
  opts?.onProgress?.({ phase: 'decrypt', ratio: 1, detail: 'Done' });
  return plain;
}

/** Choose format: videos & large files → chunked */
export function chooseEncFormat(file: { size: number; type: string; name: string }): EncFormat {
  const video =
    file.type.startsWith('video/') ||
    /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);
  if (video || file.size >= 512 * 1024) return 'chunked';
  return 'legacy';
}

export async function encryptForUpload(
  data: Uint8Array,
  key: Uint8Array,
  format: EncFormat,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  if (format === 'chunked') {
    return encryptChunked(data, key, { onProgress });
  }
  onProgress?.({ phase: 'encrypt', ratio: 0.5, detail: 'Encrypting…' });
  const out = await encryptLegacy(data, key);
  onProgress?.({ phase: 'encrypt', ratio: 1, detail: 'Encrypted' });
  return out;
}
