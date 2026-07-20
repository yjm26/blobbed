import { insertFile, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess, sanitizeThumbForStorage } from '../lib/owner-auth.js';

/** Keep wrapped DEK / legacy key; drop absurd payloads. Never force empty. */
function sanitizeEncryptedKey(k: unknown): string {
  if (k == null || k === '') return '';
  const s = String(k);
  if (s.length > 8192) return '';
  if (s.startsWith('bw1.') || s.startsWith('bk1.')) return s;
  // legacy plain base64 DEK — still persist (client may re-wrap later)
  return s;
}

function sanitizeFolderWrappedKey(k: unknown): string | undefined {
  if (k == null || k === '') return undefined;
  const s = String(k);
  if (s.length > 8192) return undefined;
  return s.startsWith('fk1.') ? s : undefined;
}

export async function handleAddFile(
  body: Record<string, unknown>,
  ownerAddress: string
) {
  const file = (body.file || body) as Record<string, unknown>;
  if (!file.blobName && !file.shelbyHash) {
    return {
      status: 400,
      json: { error: 'Missing blobName', code: 'BAD_REQUEST' },
    };
  }
  if (!file.originalName) {
    return {
      status: 400,
      json: { error: 'Missing originalName', code: 'BAD_REQUEST' },
    };
  }

  const blobName = String(file.blobName || file.shelbyHash);
  const verified = verifyLibraryAccess(
    body,
    ownerAddress,
    'addFile',
    blobName
  );
  if (!verified.ok) {
    return {
      status: 401,
      json: { error: verified.error, code: verified.code },
    };
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
    encryptedKey: sanitizeEncryptedKey(file.encryptedKey),
    folderWrappedKey: sanitizeFolderWrappedKey(file.folderWrappedKey),
    createdAt: String(file.createdAt || new Date().toISOString()),
    folderId:
      file.folderId === undefined || file.folderId === null
        ? null
        : String(file.folderId),
    encFormat:
      file.encFormat === 'chunked' || file.encFormat === 'legacy'
        ? file.encFormat
        : 'legacy',
    expiresAt: file.expiresAt ? String(file.expiresAt) : undefined,
  });

  return { status: 200, json: { file: saved, ...dbStatus() } };
}
