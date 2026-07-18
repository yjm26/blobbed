import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createFolder,
  dbStatus,
  deleteFolder,
  getLibrary,
  renameFolder,
} from './lib/db.js';

/**
 * GET    /api/folders?owner=0x…
 * POST   /api/folders  { ownerAddress, name, id? }
 * PATCH  /api/folders  { ownerAddress, folderId, name }
 * DELETE /api/folders?owner=0x…&id=uuid
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
      return res.status(200).json({ folders: lib.folders, ...dbStatus() });
    }

    if (req.method === 'POST') {
      const { ownerAddress, name, id } = req.body || {};
      if (!ownerAddress) {
        return res.status(400).json({ error: 'Missing ownerAddress' });
      }
      const folder = await createFolder(ownerAddress, name || 'Album', id);
      return res.status(201).json({ folder, ...dbStatus() });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { ownerAddress, folderId, name } = req.body || {};
      if (!ownerAddress || !folderId || !name) {
        return res.status(400).json({ error: 'Missing ownerAddress, folderId, or name' });
      }
      const ok = await renameFolder(ownerAddress, folderId, name);
      if (!ok) return res.status(404).json({ error: 'Folder not found' });
      return res.status(200).json({ success: true, ...dbStatus() });
    }

    if (req.method === 'DELETE') {
      const owner = req.query.owner;
      const id = req.query.id;
      if (!owner || typeof owner !== 'string' || !id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing owner or id' });
      }
      const ok = await deleteFolder(owner, id);
      if (!ok) return res.status(404).json({ error: 'Folder not found' });
      return res.status(200).json({ success: true, ...dbStatus() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Folders API error';
    console.error('folders API:', err);
    return res.status(500).json({ error: message, ...dbStatus() });
  }
}
