import { generateKey, encryptFile, keyToBase64 } from './crypto';
import {
  chooseEncFormat,
  encryptForUpload,
} from './chunked-crypto';
import { generateThumbDataUrl } from './thumbs';
import { addFile } from './library-store';
import { ensureVaultUnlocked, sealThumb } from './vault';
import { wrapFileKey } from './key-wrap';
import { createOwnerAuth, sha256Hex } from './owner-auth';
import type { FileMetadata, UploadResult, WalletAccount } from './types';

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export type UploadProgress = {
  name: string;
  index: number;
  total: number;
  phase: string;
  ratio: number;
};

export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: (p: UploadProgress) => void;
};

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('Upload cancelled');
    err.name = 'AbortError';
    throw err;
  }
}

export async function uploadFile(
  file: File,
  wallet: WalletAccount,
  folderId: string | null = null,
  onProgressOrOpts?: ((p: UploadProgress) => void) | UploadOptions
): Promise<UploadResult> {
  const opts: UploadOptions =
    typeof onProgressOrOpts === 'function'
      ? { onProgress: onProgressOrOpts }
      : onProgressOrOpts || {};
  const { signal, onProgress } = opts;

  const report = (phase: string, ratio: number) => {
    throwIfAborted(signal);
    onProgress?.({
      name: file.name,
      index: 0,
      total: 1,
      phase,
      ratio,
    });
  };

  report('Reading', 0.05);
  const arrayBuffer = await file.arrayBuffer();
  throwIfAborted(signal);
  const data = new Uint8Array(arrayBuffer);

  report('Thumbnail', 0.1);
  const plainThumb = await generateThumbDataUrl(file);
  throwIfAborted(signal);

  const key = generateKey();
  const format = chooseEncFormat(file);

  report(format === 'chunked' ? 'Encrypt (chunked)' : 'Encrypt', 0.15);
  let combined: Uint8Array;
  if (format === 'chunked') {
    combined = await encryptForUpload(data, key, 'chunked', (p) => {
      report(p.detail || 'Encrypt', 0.15 + p.ratio * 0.45);
    });
  } else {
    const encrypted = await encryptFile(data, key);
    combined = new Uint8Array(encrypted.iv.length + encrypted.ciphertext.length);
    combined.set(encrypted.iv);
    combined.set(encrypted.ciphertext, encrypted.iv.length);
    report('Encrypted', 0.55);
  }

  report('Sign upload', 0.58);
  const encryptedBase64 = uint8ToBase64(combined);
  const payloadHash = await sha256Hex(combined);
  throwIfAborted(signal);
  const auth = await createOwnerAuth(wallet, 'upload', payloadHash);
  throwIfAborted(signal);

  report('Upload to Shelby', 0.62);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encryptedBase64,
      fileName: file.name,
      ownerAddress: wallet.address,
      fileSize: file.size,
      folderId,
      encFormat: format,
      auth,
    }),
    signal,
  });

  const body = await res.json().catch(() => ({ error: 'Upload failed' }));
  if (!res.ok) {
    const extra =
      body.code === 'MISSING_APTOS_PRIVATE_KEY'
        ? ' (server needs APTOS_PRIVATE_KEY)'
        : body.code === 'INSUFFICIENT_FUNDS'
          ? ' (fund ShelbyUSD on shelbynet)'
          : body.code === 'AUTH_REQUIRED' || String(body.code || '').startsWith('AUTH_')
            ? ' (wallet auth failed — reconnect)'
            : body.code === 'RATE_LIMIT'
              ? ' (rate limited)'
              : '';
    throw new Error((body.error || 'Upload failed') + extra);
  }

  report('Wrap key', 0.88);
  const storageAccount = body.storageAccount as string;
  const blobName = (body.blobName || body.blobHash) as string;
  const keyB64 = keyToBase64(key);
  const vaultKey = await ensureVaultUnlocked(wallet);
  throwIfAborted(signal);
  const storedKey = await wrapFileKey(key, vaultKey);
  const sealedThumb = plainThumb ? await sealThumb(plainThumb, wallet) : undefined;
  const id = crypto.randomUUID();

  report('Save library', 0.92);
  const meta: FileMetadata = {
    id,
    ownerAddress: wallet.address,
    storageAccount,
    blobName,
    shelbyHash: blobName,
    originalName: file.name,
    sizeBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
    encryptedKey: storedKey,
    createdAt: new Date().toISOString(),
    folderId,
    encFormat: format,
    thumbDataUrl: sealedThumb,
  };

  await addFile(wallet.address, meta);
  report('Done', 1);

  return {
    storageAccount,
    blobName,
    blobHash: blobName,
    key: keyB64,
    fileId: id,
  };
}

export async function uploadFiles(
  files: File[],
  wallet: WalletAccount,
  folderId: string | null,
  onEach?: (name: string, index: number, total: number, phase?: string) => void
): Promise<UploadResult[]> {
  const out: UploadResult[] = [];
  for (let i = 0; i < files.length; i++) {
    onEach?.(files[i].name, i, files.length, 'start');
    out.push(
      await uploadFile(files[i], wallet, folderId, {
        onProgress: (p) => {
          onEach?.(p.name, i, files.length, p.phase);
        },
      })
    );
  }
  return out;
}
