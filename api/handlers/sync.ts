import { getLibrary, putLibrary, dbStatus } from '../lib/db.js';
import { verifyLibraryAccess, rateLimit } from '../lib/owner-auth.js';
import type { FileMetadata, FolderMetadata } from '../lib/db.js';

function normAddr(a: string): string {
  const s = String(a || '').trim().toLowerCase();
  return s.startsWith('0x') ? s : `0x${s}`;
}

/**
 * Authenticated library read (and optional full migrate write).
 * Requires sessionToken or owner auth — never open by address alone.
 */
export async function handleSync(
  body: Record<string, unknown>,
  ownerAddress: string
) {
  const address = normAddr(
    ownerAddress || String(body.ownerAddress || body.address || '')
  );
  if (!address || address === '0x') {
    return {
      status: 400,
      json: { error: 'Missing ownerAddress', code: 'BAD_REQUEST' },
    };
  }

  const rl = rateLimit(`sync:${address}`, 60, 60_000);
  if (!rl.ok) {
    return {
      status: 429,
      json: {
        error: 'Too many sync requests',
        code: 'RATE_LIMIT',
        retryAfterSec: rl.retryAfterSec,
      },
    };
  }

  const wantsWrite =
    Array.isArray(body.folders) || Array.isArray(body.files);

  const verified = verifyLibraryAccess(
    body,
    address,
    'sync',
    wantsWrite ? 'migrate' : 'read'
  );
  if (!verified.ok) {
    return {
      status: 401,
      json: { error: verified.error, code: verified.code },
    };
  }

  if (wantsWrite) {
    const lib = await putLibrary(verified.address, {
      folders: Array.isArray(body.folders)
        ? (body.folders as FolderMetadata[])
        : [],
      files: Array.isArray(body.files) ? (body.files as FileMetadata[]) : [],
    });
    return { status: 200, json: { ...lib, ...dbStatus() } };
  }

  const lib = await getLibrary(verified.address);
  return { status: 200, json: { ...lib, ...dbStatus() } };
}
