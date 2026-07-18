import type { VercelRequest, VercelResponse } from 'vercel';

// In-memory mock DB for MVP
const files: any[] = [];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { ownerAddress, blobHash, originalName, sizeBytes, mimeType, encryptedKey } = req.body;
    if (!ownerAddress || !blobHash || !originalName) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const file = {
      id: crypto.randomUUID(),
      ownerAddress,
      blobHash,
      originalName,
      sizeBytes,
      mimeType,
      encryptedKey,
      createdAt: new Date().toISOString(),
    };
    files.push(file);
    return res.status(201).json(file);
  }

  if (req.method === 'GET') {
    const { owner } = req.query;
    if (!owner) return res.status(400).json({ error: 'Missing owner' });
    const ownerFiles = files.filter(f => f.ownerAddress === owner);
    return res.status(200).json(ownerFiles);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const idx = files.findIndex(f => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'File not found' });
    files.splice(idx, 1);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
