import { renameFolder, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess } from '../lib/owner-auth.js';

export async function handleRenameFolder(
  body: Record<string, unknown>,
  ownerAddress: string
) {
  const folderId = body.folderId || body.id;
  const name = body.name || body.newName;

  if (!folderId || !name) {
    return {
      status: 400,
      json: { error: 'Missing folderId or name', code: 'BAD_REQUEST' },
    };
  }

  const address = ownerAddress || String(body.address || '');
  if (!address) {
    return {
      status: 400,
      json: { error: 'Missing ownerAddress', code: 'BAD_REQUEST' },
    };
  }

  const verified = verifyLibraryAccess(
    body,
    address,
    'renameFolder',
    String(folderId)
  );
  if (!verified.ok) {
    return {
      status: 401,
      json: { error: verified.error, code: verified.code },
    };
  }

  const ok = await renameFolder(
    verified.address,
    String(folderId),
    String(name)
  );
  if (!ok) {
    return {
      status: 404,
      json: { error: 'Folder not found', code: 'NOT_FOUND' },
    };
  }

  return { status: 200, json: { success: true, ...dbStatus() } };
}
