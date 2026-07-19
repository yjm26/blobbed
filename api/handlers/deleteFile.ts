import { deleteFile, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess } from '../lib/owner-auth.js';

export async function handleDeleteFile(body: any, ownerAddress: string) {
  const fileId = body.fileId || body.id;
  if (!fileId) return { status: 400, json: { error: 'Missing fileId' } };

  const verified = verifyLibraryAccess(body, ownerAddress, 'deleteFile', String(fileId));
  if (!verified.ok) {
    return { status: 401, json: { error: verified.error, code: verified.code } };
  }

  const ok = await deleteFile(verified.address, String(fileId));
  if (!ok) return { status: 404, json: { error: 'File not found' } };

  return { status: 200, json: { success: true, ...dbStatus() } };
}
