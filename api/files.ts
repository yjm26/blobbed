import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  dbStatus,
  deleteFile,
  insertFile,
  listFilesDb,
} from './lib/db.js';

/**
 * Metadata only — never stores file bytes.
 * Backed by Neon when DATABASE_URL is set; else in-memory fallback.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'POST') {
      const {
        id,
        ownerAddress,
        storageAccount,
        blobName,
        blobHash,
        originalName,
        sizeBytes,
        mimeType,
        encryptedKey,
        folderId,
        createdAt,
        expiresAt,
      } = req.body || {};

      const name = blobName || blobHash;
      if (!ownerAddress || !name || !originalName) {
        return res
          .status(400)
          .json({ error: 'Missing fields: ownerAddress, blobName, originalName' });
      }

      const file = await insertFile({
        id: id || crypto.randomUUID(),
        ownerAddress,
        storageAccount: storageAccount || ownerAddress,
        blobName: name,
        shelbyHash: blobHash || name,
        originalName,
        sizeBytes: sizeBytes ?? 0,
        mimeType: mimeType || 'application/octet-stream',
        encryptedKey: encryptedKey || '',
        folderId: folderId ?? null,
        createdAt: createdAt || new Date().toISOString(),
        expiresAt,
      });

      return res.status(201).json({ ...file, blobHash: file.blobName, ...dbStatus() });
    }

    if (req.method === 'GET') {
      const { owner, folderId } = req.query;
      if (!owner || typeof owner !== 'string') {
        return res.status(400).json({ error: 'Missing owner' });
      }
      let folderFilter: string | null | undefined = undefined;
      if (typeof folderId === 'string') {
        folderFilter =
          folderId === '' || folderId === 'root' ? null : folderId;
      }
      const list = await listFilesDb(owner, folderFilter);
      return res.status(200).json(list);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      const owner = req.query.owner;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing id' });
      }
      if (!owner || typeof owner !== 'string') {
        return res.status(400).json({ error: 'Missing owner' });
      }
      const ok = await deleteFile(owner, id);
      if (!ok) return res.status(404).json({ error: 'File not found' });
      return res.status(200).json({ success: true, ...dbStatus() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Files API error';
    console.error('files API:', err);
    return res.status(500).json({ error: message, ...dbStatus() });
  }
}
