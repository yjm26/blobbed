import express from 'express';
import { handleSync } from './handlers/sync.js';
import { handleSession } from './handlers/session.js';
import { handleCreateFolder } from './handlers/createFolder.js';
import { handleRenameFile } from './handlers/renameFile.js';
import { handleRenameFolder } from './handlers/renameFolder.js';
import { handleDeleteFile } from './handlers/deleteFile.js';
import { handleDeleteFolder } from './handlers/deleteFolder.js';
import { handleAddFile } from './handlers/addFile.js';
import { handleMoveFile } from './handlers/moveFile.js';
import {
  handleEnableFolderShare,
  handleRevokeFolderShare,
} from './handlers/folderShare.js';
import { publicError } from './lib/http-error.js';

const app = express();

app.use(express.json({ limit: '12mb' }));

/** GET unauth meta disabled — use POST + session/auth */
app.get('/api/library', (_req, res) => {
  return res.status(410).json({
    error: 'GET library disabled',
    code: 'USE_POST_LIBRARY',
    hint: 'POST /api/library with op session|sync and sessionToken or auth',
  });
});

app.post('/api/library', async (req, res) => {
  try {
    const raw = (req.body || {}) as Record<string, unknown>;
    const op = raw.op;
    const ownerAddress = String(
      raw.ownerAddress || raw.address || ''
    );

    if (!op || typeof op !== 'string') {
      return res.status(400).json({ error: 'Missing op', code: 'BAD_REQUEST' });
    }

    // body without op for handlers (keep owner fields too — handlers read both)
    const body = { ...raw };

    let result: { status: number; json: Record<string, unknown> | object };

    switch (op) {
      case 'session':
        result = await handleSession(body, ownerAddress);
        break;

      case 'sync':
      case 'getLibrary':
        result = await handleSync(body, ownerAddress);
        break;

      case 'createFolder':
        result = await handleCreateFolder(body, ownerAddress);
        break;

      case 'renameFolder':
        result = await handleRenameFolder(body, ownerAddress);
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

      case 'moveFile':
        result = await handleMoveFile(body, ownerAddress);
        break;

      case 'enableFolderShare':
        result = await handleEnableFolderShare(body, ownerAddress);
        break;

      case 'revokeFolderShare':
        result = await handleRevokeFolderShare(body, ownerAddress);
        break;

      default:
        return res.status(400).json({
          error: 'Unknown op',
          code: 'BAD_REQUEST',
          hint: 'session | sync | getLibrary | createFolder | renameFolder | renameFile | deleteFile | deleteFolder | addFile | moveFile | enableFolderShare | revokeFolderShare',
        });
    }

    return res.status(result.status).json(result.json);
  } catch (err: unknown) {
    const body = publicError(err, 'Library API error');
    return res.status(500).json(body);
  }
});

export default app;
