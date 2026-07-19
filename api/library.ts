import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { dbStatus } from './lib/db.js';
import { handleSync } from './handlers/sync.js';
import { handleCreateFolder } from './handlers/createFolder.js';
import { handleRenameFile } from './handlers/renameFile.js';
import { handleDeleteFile } from './handlers/deleteFile.js';
import { handleDeleteFolder } from './handlers/deleteFolder.js';
import { handleAddFile } from './handlers/addFile.js';

const app = express();

app.use(express.json({ limit: '12mb' }));

// GET → dipakai hydrateLibrary (apiGet)
app.get('/api/library', async (req, res) => {
  try {
    const ownerAddress = req.query.owner as string;
    if (!ownerAddress) {
      return res.status(400).json({ error: 'Missing owner' });
    }
    const result = await handleSync(ownerAddress);
    return res.status(result.status).json(result.json);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Library API error';
    console.error('library API GET:', err);
    return res.status(500).json({ error: message, ...dbStatus() });
  }
});

// POST → untuk createFolder, rename, delete, addFile, sync manual
app.post('/api/library', async (req, res) => {
  try {
    const { op, ownerAddress, ...body } = req.body || {};

    if (!op) {
      return res.status(400).json({ error: 'Missing op' });
    }

    let result;

    switch (op) {
      case 'sync':
      case 'getLibrary':
        result = await handleSync(ownerAddress || body.address);
        break;

      case 'createFolder':
        result = await handleCreateFolder(body, ownerAddress);
        break;

      case 'renameFile':
        result = await handleRenameFile(body, ownerAddress);
        break;

      case 'deleteFile':
        result = await handleDeleteFile(body, ownerAddress);
        break;

      case 'deleteFolder':
        result = await handleDeleteFolder(body, ownerAddress);
        break;

      case 'addFile':
        result = await handleAddFile(body, ownerAddress);
        break;

      default:
        return res.status(400).json({
          error: 'Unknown op',
          hint: 'sync | createFolder | renameFile | deleteFile | addFile',
        });
    }

    return res.status(result.status).json(result.json);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Library API error';
    console.error('library API:', err);
    return res.status(500).json({ error: message, ...dbStatus() });
  }
});

export default app;
