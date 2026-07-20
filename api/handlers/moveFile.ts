import { moveFile, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess } from '../lib/owner-auth.js';

export async function handleMoveFile(
  body: Record<string, unknown>,
  ownerAddress: string
) {
  const fileId = body.fileId || body.id;
  if (!fileId) {
    return {
      status: 400,
      json: { error: 'Missing fileId', code: 'BAD_REQUEST' },
    };
  }

  const address = ownerAddress || String(body.address || '');
  if (!address) {
    return {
      status: 400,
      json: { error: 'Missing ownerAddress', code: 'BAD_REQUEST' },
    };
  }

  // folderId: string | null | undefined — undefined invalid; null = root
  const rawFolder = body.folderId;
  const folderId =
    rawFolder === null || rawFolder === '' || rawFolder === 'root'
      ? null
      : rawFolder != null
        ? String(rawFolder)
        : null;

  const verified = verifyLibraryAccess(
    body,
    address,
    'moveFile',
    String(fileId)
  );
  if (!verified.ok) {
    return {
      status: 401,
      json: { error: verified.error, code: verified.code },
    };
  }

  const ok = await moveFile(
    verified.address,
    String(fileId),
    folderId,
    typeof body.folderWrappedKey === 'string' && body.folderWrappedKey.startsWith('fk1.')
      ? body.folderWrappedKey
      : null
  );
  if (!ok) {
    return {
      status: 404,
      json: { error: 'File not found', code: 'NOT_FOUND' },
    };
  }

  return {
    status: 200,
    json: { success: true, folderId, ...dbStatus() },
  };
}
