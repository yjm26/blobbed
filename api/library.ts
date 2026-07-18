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

/**
 * GET  /api/library?owner=0x…          → full library + backend status
 * POST /api/library
 *   { op: 'sync', ownerAddress, folders, files }  → replace snapshot (migrate)
 *   { op: 'createFolder', ownerAddress, name, id? }
 *   { op: 'renameFolder', ownerAddress, folderId, name }
 *   { op: 'deleteFolder', ownerAddress, folderId }
 *   { op: 'addFile', ownerAddress, file }
 *   { op: 'deleteFile', ownerAddress, fileId }
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
      return res.status(200).json({ ...lib, ...dbStatus() });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const op = body.op as string;
      const ownerAddress = body.ownerAddress as string;
      if (!ownerAddress) {
        return res.status(400).json({ error: 'Missing ownerAddress' });
      }

      if (op === 'sync') {
        const lib = await putLibrary(ownerAddress, {
          folders: Array.isArray(body.folders) ? body.folders : [],
          files: Array.isArray(body.files) ? body.files : [],
        });
        return res.status(200).json({ ...lib, ...dbStatus() });
      }

      if (op === 'createFolder') {
        const folder = await createFolder(ownerAddress, body.name || 'Album', body.id);
        return res.status(201).json({ folder, ...dbStatus() });
      }

      if (op === 'renameFolder') {
        if (!body.folderId || !body.name) {
          return res.status(400).json({ error: 'Missing folderId or name' });
        }
        const ok = await renameFolder(ownerAddress, body.folderId, body.name);
        if (!ok) return res.status(404).json({ error: 'Folder not found' });
        return res.status(200).json({ success: true, ...dbStatus() });
      }

      if (op === 'deleteFolder') {
        if (!body.folderId) {
          return res.status(400).json({ error: 'Missing folderId' });
        }
        const ok = await deleteFolder(ownerAddress, body.folderId);
        if (!ok) return res.status(404).json({ error: 'Folder not found' });
        return res.status(200).json({ success: true, ...dbStatus() });
      }

      if (op === 'addFile') {
        const file = body.file || body;
        if (!file.blobName && !file.shelbyHash) {
          return res.status(400).json({ error: 'Missing file.blobName' });
        }
        if (!file.originalName) {
          return res.status(400).json({ error: 'Missing file.originalName' });
        }
        const saved = await insertFile({
          id: file.id || crypto.randomUUID(),
          ownerAddress,
          storageAccount: file.storageAccount || ownerAddress,
          blobName: file.blobName || file.shelbyHash,
          shelbyHash: file.shelbyHash || file.blobName,
          originalName: file.originalName,
          sizeBytes: file.sizeBytes ?? 0,
          mimeType: file.mimeType || 'application/octet-stream',
          encryptedKey: file.encryptedKey || '',
          folderId: file.folderId ?? null,
          createdAt: file.createdAt || new Date().toISOString(),
          expiresAt: file.expiresAt,
        });
        return res.status(201).json({ file: saved, ...dbStatus() });
      }

      if (op === 'deleteFile') {
        const fileId = body.fileId || body.id;
        if (!fileId) return res.status(400).json({ error: 'Missing fileId' });
        const ok = await deleteFile(ownerAddress, fileId);
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
