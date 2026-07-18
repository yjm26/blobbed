import { generateKey, encryptFile, keyToBase64 } from './crypto';
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

export async function uploadFile(
  file: File,
  wallet: WalletAccount,
  folderId: string | null = null
): Promise<UploadResult> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const key = generateKey();
  const encrypted = await encryptFile(data, key);

  const combined = new Uint8Array(encrypted.iv.length + encrypted.ciphertext.length);
  combined.set(encrypted.iv);
  combined.set(encrypted.ciphertext, encrypted.iv.length);
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
    }),
  });

  const body = await res.json().catch(() => ({ error: 'Upload failed' }));
  if (!res.ok) {
    const extra =
      body.code === 'MISSING_APTOS_PRIVATE_KEY'
        ? ' (server needs APTOS_PRIVATE_KEY)'
        : '';
    throw new Error((body.error || 'Upload failed') + extra);
  }

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
  };

  // Durable library (Neon when DATABASE_URL set) + local cache
  await addFile(wallet.address, meta);

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
  onEach?: (name: string, index: number, total: number) => void
): Promise<UploadResult[]> {
  const out: UploadResult[] = [];
  for (let i = 0; i < files.length; i++) {
    onEach?.(files[i].name, i, files.length);
    out.push(await uploadFile(files[i], wallet, folderId));
  }
  return out;
}
