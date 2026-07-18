import { parseShareFragment } from './share';
import { downloadShareItem, previewObjectUrl, isImageMime, isVideoMime } from './preview';
import type { FileSharePayload, ShareFileItem } from './types';
import '../src/style.css';

function toItem(p: FileSharePayload): ShareFileItem {
  return {
    a: p.a,
    n: p.n,
    k: p.k,
    name: p.name,
    mime: p.mime,
    size: p.size,
  };
}

async function init() {
  const btn = document.getElementById('download-btn') as HTMLButtonElement | null;
  const info = document.getElementById('file-info');
  const nameEl = document.getElementById('file-name');
  const previewEl = document.getElementById('preview-slot');

  const payload = parseShareFragment(window.location.hash);

  // Redirect folder shares to view.html
  if (payload?.type === 'folder') {
    window.location.replace('/pages/view.html' + window.location.hash);
    return;
  }

  if (!payload || payload.type !== 'file' || !payload.k || !payload.n) {
    if (btn) btn.textContent = 'Invalid link';
    return;
  }

  const item = toItem(payload);
  info?.classList.remove('hidden');
  if (nameEl) nameEl.textContent = item.name;

  // Inline preview for images
  if (previewEl && isImageMime(item.mime, item.name)) {
    previewEl.innerHTML = `<p class="preview-loading">Loading preview…</p>`;
    try {
      const url = await previewObjectUrl(item);
      previewEl.innerHTML = `<img class="download-preview-img" src="${url}" alt="" />`;
    } catch (e) {
      previewEl.innerHTML = `<p class="preview-error">Preview failed</p>`;
      console.error(e);
    }
  } else if (previewEl && isVideoMime(item.mime, item.name)) {
    previewEl.innerHTML = `<p class="preview-loading">Loading video…</p>`;
    try {
      const url = await previewObjectUrl(item);
      previewEl.innerHTML = `<video class="download-preview-video" src="${url}" controls playsinline></video>`;
    } catch (e) {
      previewEl.innerHTML = `<p class="preview-error">Preview failed</p>`;
      console.error(e);
    }
  }

  btn?.addEventListener('click', async () => {
    try {
      btn.disabled = true;
      btn.textContent = 'Downloading…';
      await downloadShareItem(item);
      btn.textContent = 'Download file';
    } catch (err: unknown) {
      alert('Download failed: ' + (err instanceof Error ? err.message : err));
      btn.textContent = 'Download file';
    } finally {
      btn.disabled = false;
    }
  });
}

init().catch(console.error);
