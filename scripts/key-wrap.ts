/**
 * File DEK wrap formats stored in FileMetadata.encryptedKey
 *
 * plain   - base64(32-byte AES key)  [legacy MVP - server/DB can read]
 * bw1.…   - AES-GCM(vaultKey, DEK)   [wallet-derived vault key]
 *
 * Thumbs at rest:
 * plain data: URL - legacy leak (plaintext preview)
 * bt1.… - AES-GCM(vaultKey, utf8 data URL)
 *
 * Share links always carry the *raw* DEK in the URL fragment (capability).
 * Never put a bw1. blob into a share fragment.
 */

const PREFIX_V1 = 'bw1.';
const PREFIX_THUMB = 'bt1.';

export type KeyEncoding = 'plain' | 'wallet-v1';

export function detectKeyEncoding(stored: string): KeyEncoding {
  if (stored.startsWith(PREFIX_V1)) return 'wallet-v1';
  return 'plain';
}

export function isWrappedKey(stored: string): boolean {
  return detectKeyEncoding(stored) === 'wallet-v1';
}

export function isWrappedThumb(stored: string): boolean {
  return stored.startsWith(PREFIX_THUMB);
}

export function isPlainThumbDataUrl(stored: string | undefined | null): boolean {
  if (!stored) return false;
  return stored.startsWith('data:');
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

/** Normalize wallet signature strings (hex / base64 / 0x-hex). */
export function signatureToBytes(sig: string): Uint8Array {
  const s = sig.trim();
  if (!s) throw new Error('Empty signature');

  // 0x-hex or bare hex (ed25519 sig = 64 bytes → 128 hex chars; may be longer w/ scheme)
  const hex = s.startsWith('0x') || s.startsWith('0X') ? s.slice(2) : s;
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0 && hex.length >= 64) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  // base64 / base64url
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return b64ToBytes(b64 + pad);
  } catch {
    return new TextEncoder().encode(s);
  }
}

/**
 * Derive a 256-bit AES-GCM key from wallet address + signMessage signature.
 * Same address + same signature bytes → same vault key.
 */
export async function deriveVaultKey(
  ownerAddress: string,
  signature: string
): Promise<CryptoKey> {
  const addr = ownerAddress.trim().toLowerCase();
  const sigBytes = signatureToBytes(signature);
  const enc = new TextEncoder();
  const addrBytes = enc.encode(addr);
  const material = new Uint8Array(9 + addrBytes.length + sigBytes.length);
  material.set(enc.encode('blobbedv1'));
  material.set(addrBytes, 9);
  material.set(sigBytes, 9 + addrBytes.length);

  const digest = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function aesGcmEncrypt(
  vaultKey: CryptoKey,
  plain: Uint8Array
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      vaultKey,
      toArrayBuffer(plain)
    )
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv);
  packed.set(ct, iv.length);
  return bytesToB64(packed);
}

async function aesGcmDecrypt(
  vaultKey: CryptoKey,
  packedB64: string
): Promise<Uint8Array> {
  const packed = b64ToBytes(packedB64);
  if (packed.length < 12 + 16) throw new Error('Invalid wrapped payload');
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      vaultKey,
      toArrayBuffer(ct)
    );
    return new Uint8Array(plain);
  } catch {
    throw new Error('Cannot unwrap - wrong wallet or corrupted data');
  }
}

/** Wrap raw 32-byte file DEK → storage string */
export async function wrapFileKey(
  rawKey: Uint8Array,
  vaultKey: CryptoKey
): Promise<string> {
  if (rawKey.length !== 32) {
    throw new Error('File key must be 32 bytes');
  }
  return PREFIX_V1 + (await aesGcmEncrypt(vaultKey, rawKey));
}

/** Unwrap storage string → raw 32-byte DEK (handles legacy plain) */
export async function unwrapFileKey(
  stored: string,
  vaultKey: CryptoKey | null
): Promise<Uint8Array> {
  if (!stored) throw new Error('Missing file key');

  if (!isWrappedKey(stored)) {
    const raw = b64ToBytes(stored);
    if (raw.length !== 32) {
      throw new Error('Invalid plain file key length');
    }
    return raw;
  }

  if (!vaultKey) {
    throw new Error('Vault locked - sign with wallet to unlock keys');
  }

  const raw = await aesGcmDecrypt(vaultKey, stored.slice(PREFIX_V1.length));
  if (raw.length !== 32) throw new Error('Unwrapped key wrong size');
  return raw;
}

/** Encrypt thumb data URL for meta storage */
export async function wrapThumbDataUrl(
  dataUrl: string,
  vaultKey: CryptoKey
): Promise<string> {
  if (!dataUrl.startsWith('data:')) {
    throw new Error('Thumb must be a data URL before wrap');
  }
  const bytes = new TextEncoder().encode(dataUrl);
  return PREFIX_THUMB + (await aesGcmEncrypt(vaultKey, bytes));
}

/**
 * Resolve stored thumb → displayable data URL.
 * plain data: passthrough (legacy); bt1. decrypts; else null
 */
export async function unwrapThumbDataUrl(
  stored: string | undefined | null,
  vaultKey: CryptoKey | null
): Promise<string | null> {
  if (!stored) return null;
  if (stored.startsWith('data:')) return stored;
  if (!isWrappedThumb(stored)) return null;
  if (!vaultKey) {
    throw new Error('Vault locked - cannot decrypt thumb');
  }
  const plain = await aesGcmDecrypt(vaultKey, stored.slice(PREFIX_THUMB.length));
  return new TextDecoder().decode(plain);
}

/** plain base64 DEK → for share fragments / decrypt */
export function rawKeyToBase64(raw: Uint8Array): string {
  return bytesToB64(raw);
}

export function base64ToRawKey(b64: string): Uint8Array {
  const raw = b64ToBytes(b64);
  if (raw.length !== 32) throw new Error('Invalid key length');
  return raw;
}
