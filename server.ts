import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parseCorsAllowlist,
  resolveAllowedOrigin,
} from './api/lib/cors.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// CORS allowlist (no *)
app.use((req, res, next) => {
  const allowlist = parseCorsAllowlist();
  const origin = resolveAllowedOrigin(
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
    allowlist,
    typeof req.headers.host === 'string' ? req.headers.host : undefined
  );
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(origin ? 204 : 403);
  }
  next();
});

// API Routes
import statusHandler from './api/status.ts';
app.all('/api/status', async (req, res) => await statusHandler(req as any, res as any));

import uploadHandler from './api/upload.ts';
app.all('/api/upload', async (req, res) => await uploadHandler(req as any, res as any));

import libraryHandler from './api/library.ts';
app.all('/api/library', async (req, res) => await libraryHandler(req as any, res as any));

import filesHandler from './api/files.ts';
app.all('/api/files', async (req, res) => await filesHandler(req as any, res as any));

import foldersHandler from './api/folders.ts';
app.all('/api/folders', async (req, res) => await foldersHandler(req as any, res as any));

import sharesHandler from './api/shares.ts';
app.all('/api/shares', async (req, res) => await sharesHandler(req as any, res as any));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  immutable: true,
  index: false,
}));

// SPA fallback (compatible)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Blobbed running on port ${PORT}`);
});
