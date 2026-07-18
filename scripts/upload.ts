import { generateKey, encryptFile, keyToBase64 } from './crypto';
import type { WalletAccount } from './types';

export interface UploadResult {
  blobHash: string;
  key: string;
}

export async function uploadFile(file: File, wallet: WalletAccount): Promise<UploadResult> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Encrypt
  const key = generateKey();
  const encrypted = await encryptFile(data, key);

  // Combine IV + ciphertext → base64 for JSON transport
  const combined = new Uint8Array(encrypted.iv.length + encrypted.ciphertext.length);
  combined.set(encrypted.iv);
  combined.set(encrypted.ciphertext, encrypted.iv.length);
  const encryptedBase64 = btoa(String.fromCharCode(...combined));

  // Upload to backend relay (backend submits to Shelby Protocol)
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encryptedBase64,
      fileName: file.name,
      ownerAddress: wallet.address,
      fileSize: file.size,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }

  const result = await res.json();

  // Store metadata in backend DB
  await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerAddress: wallet.address,
      blobHash: result.blobHash,
      originalName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      encryptedKey: keyToBase64(key),
    }),
  });

  return {
    blobHash: result.blobHash,
    key: keyToBase64(key),
  };
}
