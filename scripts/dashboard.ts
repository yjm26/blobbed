import { connectWallet, getConnectedWallet, disconnectWallet } from './aptos-client';
import { uploadFile } from './upload';
import { generateShareLink } from './share';
import type { FileMetadata } from './types';
import '../src/style.css';

const GATE = '/pages/gate.html';

let wallet: { address: string; publicKey: string } | null = null;

async function init() {
  // Must be connected — else back to middle/gate page
  wallet = await getConnectedWallet();
  if (!wallet?.address) {
    try {
      wallet = await connectWallet();
    } catch {
      window.location.href = GATE;
      return;
    }
  }
  if (!wallet?.address) {
    window.location.href = GATE;
    return;
  }

  sessionStorage.setItem('blobbed_wallet', wallet.address);
  document.getElementById('wallet-address')!.textContent =
    wallet.address.slice(0, 6) + '...' + wallet.address.slice(-4);
  await loadFiles();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadFiles() {
  if (!wallet) return;
  const res = await fetch(`/api/files?owner=${encodeURIComponent(wallet.address)}`);
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
  list.innerHTML = files
    .map((f) => {
      const account = f.storageAccount || '';
      const name = f.blobName || f.shelbyHash || '';
      return `
    <div class="file-row">
      <div class="file-info">
        <span class="file-icon">📄</span>
        <div>
          <div class="file-name">${escapeHtml(f.originalName)}</div>
          <div class="file-size">${formatSize(f.sizeBytes)}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="share-btn"
          data-account="${escapeHtml(account)}"
          data-name="${escapeHtml(name)}"
          data-key="${escapeHtml(f.encryptedKey || '')}">Share</button>
        <button class="delete-btn" data-id="${escapeHtml(f.id)}">Delete</button>
      </div>
    </div>`;
    })
    .join('');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

document.getElementById('upload-btn')?.addEventListener('click', () => {
  document.getElementById('file-input')?.click();
});

document.getElementById('file-input')?.addEventListener('change', async (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files || !wallet) return;
  for (const file of Array.from(files)) {
    try {
      const result = await uploadFile(file, wallet);
      const link = generateShareLink(result.storageAccount, result.blobName, result.key);
      navigator.clipboard.writeText(link).catch(() => {});
      alert(`Uploaded to Shelby.\nShare link copied:\n${link.slice(0, 80)}…`);
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || err));
    }
  }
  await loadFiles();
  (e.target as HTMLInputElement).value = '';
});

document.getElementById('file-list')?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('share-btn')) {
    const account = target.dataset.account || '';
    const name = target.dataset.name || '';
    const key = target.dataset.key || '';
    if (!account || !name || !key) {
      alert('Missing share data for this file');
      return;
    }
    const link = generateShareLink(account, name, key);
    navigator.clipboard.writeText(link).catch(() => {});
    alert('Share link copied!');
  }
  if (target.classList.contains('delete-btn')) {
    const fileId = target.dataset.id;
    if (fileId && confirm('Delete this file metadata? (blob on Shelby remains until expiry)')) {
      fetch(`/api/files?id=${encodeURIComponent(fileId)}`, { method: 'DELETE' }).then(loadFiles);
    }
  }
});

document.getElementById('disconnect')?.addEventListener('click', async () => {
  wallet = null;
  await disconnectWallet();
  window.location.href = GATE;
});

init().catch((err) => {
  console.error(err);
  window.location.href = GATE;
});
