import { renameFile, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess } from '../lib/owner-auth.js';

export async function handleRenameFile(body: any, ownerAddress: string) {
  const fileId = body.fileId || body.id;
  const newName = body.newName || body.name;

  if (!fileId || !newName) {
    return { status: 400, json: { error: 'Missing fileId or newName' } };
  }

  const verified = verifyLibraryAccess(body, ownerAddress, 'renameFile', String(fileId));
  if (!verified.ok) {
    return { status: 401, json: { error: verified.error, code: verified.code } };
  }

  const ok = await renameFile(verified.address, String(fileId), String(newName));
  if (!ok) {
    return { status: 404, json: { error: 'File not found' } };
  }

  return { status: 200, json: { success: true, ...dbStatus() } };
}
