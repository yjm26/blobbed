import { insertFile, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess, sanitizeThumbForStorage } from '../lib/owner-auth.js';

export async function handleAddFile(body: any, ownerAddress: string) {
  const file = body.file || body;
  if (!file.blobName && !file.shelbyHash) {
    return { status: 400, json: { error: 'Missing blobName' } };
  }
  if (!file.originalName) {
    return { status: 400, json: { error: 'Missing originalName' } };
  }

  const blobName = String(file.blobName || file.shelbyHash);
  const verified = verifyLibraryAccess(body, ownerAddress, 'addFile', blobName);
  if (!verified.ok) {
    return { status: 401, json: { error: verified.error, code: verified.code } };
  }

  const thumb = sanitizeThumbForStorage(file.thumbDataUrl);
  const saved = await insertFile({
    id: String(file.id || crypto.randomUUID()),
    ownerAddress: verified.address,
    storageAccount: String(file.storageAccount || verified.address),
    blobName,
    shelbyHash: String(file.shelbyHash || blobName),
    originalName: String(file.originalName),
    sizeBytes: Number(file.sizeBytes ?? 0),
    mimeType: String(file.mimeType || 'application/octet-stream'),
    thumbDataUrl: thumb,
    encryptedKey: '',
    createdAt: new Date().toISOString(),
  });

  return { status: 200, json: { file: saved, ...dbStatus() } };
}
