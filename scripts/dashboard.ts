import { connectWallet } from './aptos-client';
import { uploadFile } from './upload';
import { generateShareLink } from './share';
import type { FileMetadata } from './types';

let wallet: any = null;

async function init() {
  wallet = await connectWallet();
  document.getElementById('wallet-address')!.textContent =
    wallet.address.slice(0, 6) + '...' + wallet.address.slice(-4);
  await loadFiles();
}

async function loadFiles() {
  const res = await fetch(`/api/files?owner=${wallet.address}`);
  const files: FileMetadata[] = res.ok ? await res.json() : [];
  const list = document.getElementById('file-list')!;
  const empty = document.getElementById('empty-state')!;

  if (files.length === 0) {
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.classList.remove('hidden');
  list.innerHTML = files.map((f: FileMetadata) => `
    <div class="file-row">
      <div class="file-info">
        <span class="file-icon">📄</span>
        <div>
          <div class="file-name">${f.originalName}</div>
          <div class="file-size">${formatSize(f.sizeBytes)}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="share-btn" data-id="${f.id}" data-hash="${f.shelbyHash}" data-key="${f.encryptedKey}">Share</button>
        <button class="delete-btn" data-id="${f.id}">Delete</button>
      </div>
    </div>
  `).join('');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// Upload flow
document.getElementById('upload-btn')?.addEventListener('click', () => {
  document.getElementById('file-input')?.click();
});

document.getElementById('file-input')?.addEventListener('change', async (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files || !wallet) return;
  for (const file of files) {
    try {
      const result = await uploadFile(file, wallet);
      const link = generateShareLink(result.blobHash, result.key);
      navigator.clipboard.writeText(link).catch(() => {});
      alert(`Uploaded! Share link copied:\n${link.slice(0, 60)}...`);
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || err));
    }
  }
  await loadFiles();
});

// Share & Delete handlers
document.getElementById('file-list')?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('share-btn')) {
    const hash = target.dataset.hash || '';
    const key = target.dataset.key || '';
    const link = generateShareLink(hash, key);
    navigator.clipboard.writeText(link).catch(() => {});
    alert('Share link copied!');
  }
  if (target.classList.contains('delete-btn')) {
    const fileId = target.dataset.id;
    if (confirm('Delete this file?')) {
      fetch(`/api/files?id=${fileId}`, { method: 'DELETE' }).then(loadFiles);
    }
  }
});

document.getElementById('disconnect')?.addEventListener('click', () => {
  wallet = null;
  window.location.reload();
});

init().catch(console.error);
