import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Metadata only — never stores file bytes.
 * In-memory for MVP (resets on cold start). Swap to Neon via DATABASE_URL later.
 */
type FileRow = {
  id: string;
  ownerAddress: string;
  storageAccount: string;
  blobName: string;
  /** @deprecated alias of blobName */
  blobHash: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  encryptedKey: string;
  folderId?: string | null;
  createdAt: string;
};

const files: FileRow[] = [];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const {
      ownerAddress,
      storageAccount,
      blobName,
      blobHash,
      originalName,
      sizeBytes,
      mimeType,
      encryptedKey,
      folderId,
    } = req.body || {};

    const name = blobName || blobHash;
    if (!ownerAddress || !name || !originalName) {
      return res.status(400).json({ error: 'Missing fields: ownerAddress, blobName, originalName' });
    }

    const file: FileRow = {
      id: crypto.randomUUID(),
      ownerAddress,
      storageAccount: storageAccount || ownerAddress,
      blobName: name,
      blobHash: name,
      originalName,
      sizeBytes: sizeBytes ?? 0,
      mimeType: mimeType || 'application/octet-stream',
      encryptedKey: encryptedKey || '',
      folderId: folderId || null,
      createdAt: new Date().toISOString(),
    };
    files.push(file);
    return res.status(201).json(file);
  }

  if (req.method === 'GET') {
    const { owner, folderId } = req.query;
    if (!owner || typeof owner !== 'string') {
      return res.status(400).json({ error: 'Missing owner' });
    }
    let list = files.filter((f) => f.ownerAddress === owner);
    if (typeof folderId === 'string') {
      if (folderId === '' || folderId === 'root') {
        list = list.filter((f) => !f.folderId);
      } else {
        list = list.filter((f) => f.folderId === folderId);
      }
    }
    return res.status(200).json(list);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing id' });
    }
    const idx = files.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'File not found' });
    files.splice(idx, 1);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
