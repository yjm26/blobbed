import { deleteFolder, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess } from '../lib/owner-auth.js';

export async function handleDeleteFolder(body: any, ownerAddress: string) {
  const folderId = body.folderId || body.id;
  if (!folderId) return { status: 400, json: { error: 'Missing folderId' } };

  const verified = verifyLibraryAccess(body, ownerAddress, 'deleteFolder', String(folderId));
  if (!verified.ok) {
    return { status: 401, json: { error: verified.error, code: verified.code } };
  }

  const ok = await deleteFolder(verified.address, String(folderId));
  if (!ok) return { status: 404, json: { error: 'Folder not found' } };

  return { status: 200, json: { success: true, ...dbStatus() } };
}
