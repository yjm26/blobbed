import { createFolder, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess } from '../lib/owner-auth.js';

export async function handleCreateFolder(
  body: Record<string, unknown>,
  ownerAddress: string
) {
  const name = String(body.name || 'Untitled');
  const address = ownerAddress || String(body.address || '');

  if (!address) {
    return {
      status: 400,
      json: { error: 'Missing ownerAddress', code: 'BAD_REQUEST' },
    };
  }

  const verified = verifyLibraryAccess(body, address, 'createFolder', name);
  if (!verified.ok) {
    return {
      status: 401,
      json: { error: verified.error, code: verified.code },
    };
  }

  const id = body.id ? String(body.id) : undefined;
  const folder = await createFolder(verified.address, name, id);
  return { status: 200, json: { folder, ...dbStatus() } };
}
