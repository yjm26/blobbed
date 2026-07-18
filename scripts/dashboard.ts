import { connectWallet, getConnectedWallet, disconnectWallet } from './aptos-client';
import { uploadFiles } from './upload';
import {
  createFolder,
  listFiles,
  listFolders,
  removeFile,
  getFolder,
  countFilesInFolder,
} from './library-store';
import {
  generateFileShareLink,
  generateFolderShareLink,
  fileToShareItem,
} from './share';
import {
  previewObjectUrl,
  isImageMime,
  isVideoMime,
} from './preview';
import type { FileMetadata } from './types';
import '../src/style.css';

const GATE = '/pages/gate.html';

let wallet: { address: string; publicKey: string } | null = null;
/** null = root library */
let currentFolderId: string | null = null;
const thumbUrls = new Map<string, string>();

async function init() {
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
  const chip = document.getElementById('wallet-address');
  if (chip) {
    chip.textContent = wallet.address.slice(0, 6) + '…' + wallet.address.slice(-4);
    chip.setAttribute('title', wallet.address);
  }

  wireUi();
  render();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function setStatus(msg: string, kind: 'info' | 'err' | 'ok' = 'info') {
  const el = document.getElementById('upload-status');
  if (!el) return;
  if (!msg) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }
  el.classList.remove('hidden');
  el.dataset.kind = kind;
  el.textContent = msg;
}

function owner(): string {
  return wallet!.address;
}

function render() {
  if (!wallet) return;
  const folders = listFolders(owner());
  const files = listFiles(owner(), currentFolderId);

  const title = document.getElementById('stage-title');
  const sub = document.getElementById('stage-sub');
  const back = document.getElementById('btn-back');
  const shareFolderBtn = document.getElementById('btn-share-folder');
  const dropHint = document.getElementById('drop-hint');
  const navRoot = document.getElementById('nav-root');
  const folderNav = document.getElementById('folder-nav');
  const folderGrid = document.getElementById('folder-grid');
  const fileList = document.getElementById('file-list');
  const empty = document.getElementById('empty-state');
  const drop = document.getElementById('drop-zone');

  navRoot?.classList.toggle('is-active', currentFolderId === null);

  if (folderNav) {
    folderNav.innerHTML = folders
      .map(
        (f) => `
      <button type="button" class="app-rail-item ${
        currentFolderId === f.id ? 'is-active' : ''
      }" data-open-folder="${escapeHtml(f.id)}">
        ${escapeHtml(f.name)}
        <span class="app-rail-count">${countFilesInFolder(owner(), f.id)}</span>
      </button>`
      )
      .join('');
  }

  if (currentFolderId) {
    const folder = getFolder(owner(), currentFolderId);
    if (title) title.textContent = folder?.name || 'Folder';
    if (sub) sub.textContent = `${files.length} file${files.length === 1 ? '' : 's'} in this folder`;
    back?.classList.remove('hidden');
    shareFolderBtn?.classList.remove('hidden');
    if (dropHint) dropHint.textContent = 'Upload into this folder · multi-select ok';
    if (folderGrid) folderGrid.innerHTML = '';
  } else {
    if (title) title.textContent = 'Library';
    if (sub) {
      sub.textContent = `${folders.length} folder${folders.length === 1 ? '' : 's'} · ${
        listFiles(owner(), null).length
      } loose file${listFiles(owner(), null).length === 1 ? '' : 's'}`;
    }
    back?.classList.add('hidden');
    shareFolderBtn?.classList.add('hidden');
    if (dropHint) dropHint.textContent = 'or click to browse · multi-select ok';

    if (folderGrid) {
      folderGrid.innerHTML = folders
        .map(
          (f) => `
        <button type="button" class="drive-folder-card" data-open-folder="${escapeHtml(f.id)}">
          <span class="drive-folder-icon">▢</span>
          <span class="drive-folder-name">${escapeHtml(f.name)}</span>
          <span class="drive-folder-meta">${countFilesInFolder(owner(), f.id)} items</span>
        </button>`
        )
        .join('');
    }
  }

  // Files
  if (fileList) {
    if (files.length === 0) {
      fileList.innerHTML = '';
      fileList.classList.add('hidden');
    } else {
      fileList.classList.remove('hidden');
      fileList.innerHTML = files
        .map((f) => {
          const canPreview = isImageMime(f.mimeType, f.originalName) || isVideoMime(f.mimeType, f.originalName);
          return `
        <article class="app-file-row" data-file-id="${escapeHtml(f.id)}">
          <div class="app-file-thumb" data-thumb="${escapeHtml(f.id)}">
            <span class="app-file-thumb-ph">${canPreview ? '…' : 'FILE'}</span>
          </div>
          <div class="app-file-meta">
            <h3 class="app-file-name">${escapeHtml(f.originalName)}</h3>
            <p class="app-file-sub">${formatSize(f.sizeBytes)} · ${escapeHtml(
              (f.createdAt || '').slice(0, 10)
            )}</p>
          </div>
          <div class="app-file-actions">
            ${
              canPreview
                ? `<button type="button" class="app-btn-text preview-btn" data-id="${escapeHtml(
                    f.id
                  )}">Preview</button>`
                : ''
            }
            <button type="button" class="app-btn-text share-btn" data-id="${escapeHtml(
              f.id
            )}">Share</button>
            <button type="button" class="app-btn-text app-btn-danger delete-btn" data-id="${escapeHtml(
              f.id
            )}">Delete</button>
          </div>
        </article>`;
        })
        .join('');

      // Lazy thumbs for images
      for (const f of files) {
        if (isImageMime(f.mimeType, f.originalName)) {
          void loadThumb(f);
        }
      }
    }
  }

  const hasContent =
    files.length > 0 || (currentFolderId === null && folders.length > 0);
  empty?.classList.toggle('hidden', hasContent);
  drop?.classList.toggle('app-drop-compact', files.length > 0);
}

async function loadThumb(f: FileMetadata) {
  const slot = document.querySelector(`[data-thumb="${CSS.escape(f.id)}"]`);
  if (!slot) return;
  if (thumbUrls.has(f.id)) {
    slot.innerHTML = `<img src="${thumbUrls.get(f.id)}" alt="" />`;
    return;
  }
  try {
    const url = await previewObjectUrl(fileToShareItem(f));
    thumbUrls.set(f.id, url);
    slot.innerHTML = `<img src="${url}" alt="" />`;
  } catch {
    slot.innerHTML = `<span class="app-file-thumb-ph">IMG</span>`;
  }
}

function findFile(id: string): FileMetadata | undefined {
  if (!wallet) return undefined;
  const root = listFiles(owner(), null);
  const inFolder = currentFolderId ? listFiles(owner(), currentFolderId) : [];
  const allFolders = listFolders(owner()).flatMap((fol) => listFiles(owner(), fol.id));
  return (
    inFolder.find((f) => f.id === id) ||
    root.find((f) => f.id === id) ||
    allFolders.find((f) => f.id === id)
  );
}

async function handleFiles(fileList: FileList | File[]) {
  if (!wallet) return;
  const files = Array.from(fileList);
  if (!files.length) return;
  try {
    await uploadFiles(files, wallet, currentFolderId, (name, i, total) => {
      setStatus(`Uploading ${i + 1}/${total}: ${name}`, 'info');
    });
    setStatus(`Uploaded ${files.length} file${files.length === 1 ? '' : 's'}`, 'ok');
  } catch (err: unknown) {
    setStatus('Upload failed: ' + (err instanceof Error ? err.message : err), 'err');
  }
  render();
}

function wireUi() {
  const input = document.getElementById('file-input') as HTMLInputElement | null;
  const openPicker = () => input?.click();

  document.getElementById('upload-btn')?.addEventListener('click', openPicker);
  document.getElementById('upload-btn-secondary')?.addEventListener('click', openPicker);

  document.getElementById('btn-new-folder')?.addEventListener('click', () => {
    if (!wallet) return;
    const name = prompt('Folder name', 'Album');
    if (!name) return;
    const folder = createFolder(owner(), name);
    currentFolderId = folder.id;
    setStatus(`Folder “${folder.name}” created`, 'ok');
    render();
  });

  document.getElementById('btn-back')?.addEventListener('click', () => {
    currentFolderId = null;
    render();
  });

  document.getElementById('nav-root')?.addEventListener('click', () => {
    currentFolderId = null;
    render();
  });

  document.getElementById('btn-share-folder')?.addEventListener('click', async () => {
    if (!wallet || !currentFolderId) return;
    const folder = getFolder(owner(), currentFolderId);
    if (!folder) return;
    const files = listFiles(owner(), currentFolderId);
    if (!files.length) {
      setStatus('Folder is empty — upload something first', 'err');
      return;
    }
    try {
      const link = generateFolderShareLink(folder, files);
      await navigator.clipboard.writeText(link);
      setStatus('Folder share link copied', 'ok');
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'Share failed', 'err');
    }
  });

  // Event delegation for folder open / file actions
  document.body.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const openBtn = t.closest('[data-open-folder]') as HTMLElement | null;
    if (openBtn?.dataset.openFolder) {
      currentFolderId = openBtn.dataset.openFolder;
      render();
      return;
    }

    if (t.classList.contains('share-btn') && t.dataset.id) {
      const file = findFile(t.dataset.id);
      if (!file) return;
      try {
        const link = generateFileShareLink(file);
        await navigator.clipboard.writeText(link);
        setStatus('Share link copied', 'ok');
      } catch (err) {
        setStatus('Share failed', 'err');
      }
      return;
    }

    if (t.classList.contains('delete-btn') && t.dataset.id) {
      if (!confirm('Remove from your library? (blob stays on Shelby until expiry)')) return;
      removeFile(owner(), t.dataset.id);
      render();
      return;
    }

    if (t.classList.contains('preview-btn') && t.dataset.id) {
      const file = findFile(t.dataset.id);
      if (!file) return;
      try {
        setStatus('Loading preview…', 'info');
        const url = await previewObjectUrl(fileToShareItem(file));
        thumbUrls.set(file.id, url);
        // simple window preview
        const w = window.open('', '_blank');
        if (w) {
          if (isImageMime(file.mimeType, file.originalName)) {
            w.document.write(
              `<title>${escapeHtml(file.originalName)}</title><body style="margin:0;background:#0a0a0a;display:flex;min-height:100vh;align-items:center;justify-content:center"><img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body>`
            );
          } else {
            w.document.write(
              `<title>${escapeHtml(file.originalName)}</title><body style="margin:0;background:#0a0a0a;display:flex;min-height:100vh;align-items:center;justify-content:center"><video src="${url}" controls autoplay style="max-width:100%;max-height:100vh"></video></body>`
            );
          }
        }
        setStatus('', 'info');
      } catch (err) {
        setStatus('Preview failed: ' + (err instanceof Error ? err.message : err), 'err');
      }
    }
  });

  const drop = document.getElementById('drop-zone');
  drop?.addEventListener('click', openPicker);
  drop?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });
  drop?.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('is-drag');
  });
  drop?.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
  drop?.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-drag');
    const files = e.dataTransfer?.files;
    if (files?.length) void handleFiles(files);
  });

  input?.addEventListener('change', async () => {
    if (input.files?.length) {
      await handleFiles(input.files);
      input.value = '';
    }
  });

  document.getElementById('disconnect')?.addEventListener('click', async () => {
    wallet = null;
    await disconnectWallet();
    window.location.href = GATE;
  });
}

// re-export helper used above - fileToShareItem is in share.ts
init().catch((err) => {
  console.error(err);
  window.location.href = GATE;
});
