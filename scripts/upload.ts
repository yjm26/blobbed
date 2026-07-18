import { generateKey, encryptFile, keyToBase64 } from './crypto';
import {
  chooseEncFormat,
  encryptForUpload,
} from './chunked-crypto';
import { generateThumbDataUrl } from './thumbs';
import { addFile } from './library-store';
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

export async function uploadFile(
  file: File,
  wallet: WalletAccount,
  folderId: string | null = null,
  onProgress?: (p: UploadProgress) => void
): Promise<UploadResult> {
  const report = (phase: string, ratio: number) =>
    onProgress?.({
      name: file.name,
      index: 0,
      total: 1,
      phase,
      ratio,
    });

  report('Reading', 0.05);
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  report('Thumbnail', 0.1);
  const thumbDataUrl = await generateThumbDataUrl(file);

  const key = generateKey();
  const format = chooseEncFormat(file);

  report(format === 'chunked' ? 'Encrypt (chunked)' : 'Encrypt', 0.15);
  let combined: Uint8Array;
  if (format === 'chunked') {
    combined = await encryptForUpload(data, key, 'chunked', (p) => {
      report(p.detail || 'Encrypt', 0.15 + p.ratio * 0.45);
    });
  } else {
    // keep legacy path for tiny images
    const encrypted = await encryptFile(data, key);
    combined = new Uint8Array(encrypted.iv.length + encrypted.ciphertext.length);
    combined.set(encrypted.iv);
    combined.set(encrypted.ciphertext, encrypted.iv.length);
    report('Encrypted', 0.55);
  }

  report('Upload to Shelby', 0.6);
  const encryptedBase64 = uint8ToBase64(combined);

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
    }),
  });

  const body = await res.json().catch(() => ({ error: 'Upload failed' }));
  if (!res.ok) {
    const extra =
      body.code === 'MISSING_APTOS_PRIVATE_KEY'
        ? ' (server needs APTOS_PRIVATE_KEY)'
        : body.code === 'INSUFFICIENT_FUNDS'
          ? ' (fund ShelbyUSD on shelbynet)'
          : '';
    throw new Error((body.error || 'Upload failed') + extra);
  }

  report('Save library', 0.9);
  const storageAccount = body.storageAccount as string;
  const blobName = (body.blobName || body.blobHash) as string;
  const keyB64 = keyToBase64(key);
  const id = crypto.randomUUID();

  const meta: FileMetadata = {
    id,
    ownerAddress: wallet.address,
    storageAccount,
    blobName,
    shelbyHash: blobName,
    originalName: file.name,
    sizeBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
    encryptedKey: keyB64,
    createdAt: new Date().toISOString(),
    folderId,
    encFormat: format,
    thumbDataUrl: thumbDataUrl || undefined,
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
      await uploadFile(files[i], wallet, folderId, (p) => {
        onEach?.(p.name, i, files.length, p.phase);
      })
    );
  }
  return out;
}
