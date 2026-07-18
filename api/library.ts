import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createFolder,
  dbStatus,
  deleteFile,
  deleteFolder,
  getLibrary,
  insertFile,
  putLibrary,
  renameFolder,
} from './lib/db.js';
import {
  issueSessionToken,
  rateLimit,
  sanitizeThumbForStorage,
  verifyLibraryAccess,
  verifyOwnerAuth,
  type OwnerAuthPayload,
} from './lib/owner-auth.js';

function requireAuth(
  body: Record<string, unknown>,
  ownerAddress: string,
  op: string,
  detail: string
): { ok: true; address: string } | { ok: false; status: number; json: Record<string, unknown> } {
  const verified = verifyLibraryAccess(body, ownerAddress, op, detail);
  if (!verified.ok) {
    return {
      ok: false,
      status: 401,
      json: {
        error: verified.error,
        code: verified.code,
        hint: 'Open drive session (sign once) or pass library auth.',
      },
    };
  }
  const rl = rateLimit(`library:${verified.address}`, 120, 60 * 60 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      status: 429,
      json: {
        error: `Library rate limit. Retry in ${rl.retryAfterSec}s`,
        code: 'RATE_LIMIT',
      },
    };
  }
  return { ok: true, address: verified.address };
}

/**
 * GET  /api/library?owner=0x…          → full library + backend status
 * POST /api/library  (requires auth)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const owner = req.query.owner;
      if (!owner || typeof owner !== 'string') {
        return res.status(400).json({ error: 'Missing owner' });
      }
      const lib = await getLibrary(owner);
      // Strip any accidental plaintext data-URL thumbs from API responses
      const files = (lib.files || []).map((f) => ({
        ...f,
        thumbDataUrl: sanitizeThumbForStorage(f.thumbDataUrl) ?? undefined,
      }));
      return res.status(200).json({ ...lib, files, ...dbStatus() });
    }

    if (req.method === 'POST') {
      const body = (req.body || {}) as Record<string, unknown>;
      const op = body.op as string;
      const ownerAddress = body.ownerAddress as string;
      if (!ownerAddress) {
        return res.status(400).json({ error: 'Missing ownerAddress' });
      }

      if (op === 'session') {
        const { createHash } = await import('crypto');
        const expectHash = createHash('sha256')
          .update('session|' + ownerAddress.trim().toLowerCase())
          .digest('hex');
        const verified = verifyOwnerAuth(body.auth as OwnerAuthPayload, {
          purpose: 'session',
          payloadHash: expectHash,
          address: ownerAddress,
        });
        if (!verified.ok) {
          return res.status(401).json({
            error: verified.error,
            code: verified.code,
            hint: 'Sign session challenge to mutate library.',
          });
        }
        const ticket = issueSessionToken(verified.address);
        return res.status(200).json({ ...ticket, address: verified.address, ...dbStatus() });
      }

      if (op === 'sync') {
        const detail = `sync:${Array.isArray(body.files) ? body.files.length : 0}`;
        const gate = requireAuth(body, ownerAddress, op, detail);
        if (!gate.ok) return res.status(gate.status).json(gate.json);

        const filesIn = Array.isArray(body.files) ? body.files : [];
        const files = filesIn.map((raw) => {
          const f = raw as Record<string, unknown>;
          return {
            ...f,
            thumbDataUrl: sanitizeThumbForStorage(f.thumbDataUrl),
          };
        });
        const lib = await putLibrary(gate.address, {
          folders: Array.isArray(body.folders) ? (body.folders as never[]) : [],
          files: files as never[],
        });
        return res.status(200).json({ ...lib, ...dbStatus() });
      }

      if (op === 'createFolder') {
        const name = String(body.name || 'Album');
        const gate = requireAuth(body, ownerAddress, op, name);
        if (!gate.ok) return res.status(gate.status).json(gate.json);
        const folder = await createFolder(gate.address, name, body.id as string | undefined);
        return res.status(201).json({ folder, ...dbStatus() });
      }

      if (op === 'renameFolder') {
        if (!body.folderId || !body.name) {
          return res.status(400).json({ error: 'Missing folderId or name' });
        }
        const gate = requireAuth(
          body,
          ownerAddress,
          op,
          `${body.folderId}:${body.name}`
        );
        if (!gate.ok) return res.status(gate.status).json(gate.json);
        const ok = await renameFolder(gate.address, String(body.folderId), String(body.name));
        if (!ok) return res.status(404).json({ error: 'Folder not found' });
        return res.status(200).json({ success: true, ...dbStatus() });
      }

      if (op === 'deleteFolder') {
        if (!body.folderId) {
          return res.status(400).json({ error: 'Missing folderId' });
        }
        const gate = requireAuth(body, ownerAddress, op, String(body.folderId));
        if (!gate.ok) return res.status(gate.status).json(gate.json);
        const ok = await deleteFolder(gate.address, String(body.folderId));
        if (!ok) return res.status(404).json({ error: 'Folder not found' });
        return res.status(200).json({ success: true, ...dbStatus() });
      }

      if (op === 'addFile') {
        const file = (body.file || body) as Record<string, unknown>;
        if (!file.blobName && !file.shelbyHash) {
          return res.status(400).json({ error: 'Missing file.blobName' });
        }
        if (!file.originalName) {
          return res.status(400).json({ error: 'Missing file.originalName' });
        }
        const blobName = String(file.blobName || file.shelbyHash);
        const gate = requireAuth(body, ownerAddress, op, blobName);
        if (!gate.ok) return res.status(gate.status).json(gate.json);

        const thumb = sanitizeThumbForStorage(file.thumbDataUrl);
        const saved = await insertFile({
          id: String(file.id || crypto.randomUUID()),
          ownerAddress: gate.address,
          storageAccount: String(file.storageAccount || gate.address),
          blobName,
          shelbyHash: String(file.shelbyHash || blobName),
          originalName: String(file.originalName),
          sizeBytes: Number(file.sizeBytes ?? 0),
          mimeType: String(file.mimeType || 'application/octet-stream'),
          encryptedKey: String(file.encryptedKey || ''),
          folderId: (file.folderId as string | null) ?? null,
          createdAt: String(file.createdAt || new Date().toISOString()),
          expiresAt: file.expiresAt as string | undefined,
          encFormat: file.encFormat as 'legacy' | 'chunked' | undefined,
          thumbDataUrl: thumb,
        });
        return res.status(201).json({ file: saved, ...dbStatus() });
      }

      if (op === 'deleteFile') {
        const fileId = body.fileId || body.id;
        if (!fileId) return res.status(400).json({ error: 'Missing fileId' });
        const gate = requireAuth(body, ownerAddress, op, String(fileId));
        if (!gate.ok) return res.status(gate.status).json(gate.json);
        const ok = await deleteFile(gate.address, String(fileId));
        if (!ok) return res.status(404).json({ error: 'File not found' });
        return res.status(200).json({ success: true, ...dbStatus() });
      }

      return res.status(400).json({
        error: 'Unknown op',
        hint: 'sync | createFolder | renameFolder | deleteFolder | addFile | deleteFile',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Library API error';
    console.error('library API:', err);
    return res.status(500).json({ error: message, ...dbStatus() });
  }
}
