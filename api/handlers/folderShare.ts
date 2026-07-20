import {
  dbStatus,
  enableFolderShare,
  revokeFolderShare,
} from '../lib/db.js';
import { verifyLibraryAccess } from '../lib/owner-auth.js';

function requireAccess(
  body: Record<string, unknown>,
  ownerAddress: string,
  op: string,
  detail: string
) {
  const verified = verifyLibraryAccess(body, ownerAddress, op, detail);
  if (!verified.ok) {
    return { ok: false as const, status: 401, json: { error: verified.error, code: verified.code } };
  }
  return { ok: true as const, address: verified.address };
}

export async function handleEnableFolderShare(
  body: Record<string, unknown>,
  ownerAddress: string
) {
  const folderId = String(body.folderId || body.id || '');
  if (!ownerAddress || !folderId) {
    return { status: 400, json: { error: 'Missing ownerAddress or folderId', code: 'BAD_REQUEST' } };
  }
  const access = requireAccess(body, ownerAddress, 'enableFolderShare', folderId);
  if (!access.ok) return access;
  const share = await enableFolderShare(access.address, folderId);
  return { status: 200, json: { share, ...dbStatus() } };
}

export async function handleRevokeFolderShare(
  body: Record<string, unknown>,
  ownerAddress: string
) {
  const shareId = String(body.shareId || body.id || '');
  if (!ownerAddress || !shareId) {
    return { status: 400, json: { error: 'Missing ownerAddress or shareId', code: 'BAD_REQUEST' } };
  }
  const access = requireAccess(body, ownerAddress, 'revokeFolderShare', shareId);
  if (!access.ok) return access;
  const ok = await revokeFolderShare(access.address, shareId);
  return ok
    ? { status: 200, json: { success: true, ...dbStatus() } }
    : { status: 404, json: { error: 'Share not found', code: 'NOT_FOUND' } };
}
