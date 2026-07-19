import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser (penting untuk upload & API)
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ============================================
// API Routes - import handler Vercel style
// ============================================

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

// ============================================
// Serve React SPA
// ============================================
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  immutable: true,
  index: false,
}));

// SPA fallback
app.get('/*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Blobbed 1-Stack running on port ${PORT}`);
});