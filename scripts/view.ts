import { parseShareFragment } from './share';
import {
  previewObjectUrl,
  downloadShareItem,
  isImageMime,
  isVideoMime,
} from './preview';
import type { ShareFileItem, SharePayload } from './types';
import '../src/style.css';

const objectUrls: string[] = [];

function showError(msg: string) {
  const el = document.getElementById('view-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setHead(title: string, sub: string) {
  const t = document.getElementById('view-title');
  const s = document.getElementById('view-sub');
  const m = document.getElementById('view-meta');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
  if (m) m.textContent = title.slice(0, 24);
}

function filesFromPayload(p: SharePayload): { title: string; files: ShareFileItem[] } {
  if (p.type === 'folder') {
    return { title: p.name || 'Folder', files: p.files || [] };
  }
  return {
    title: p.name || 'File',
    files: [
      {
        a: p.a,
        n: p.n,
        k: p.k,
        name: p.name,
        mime: p.mime,
        size: p.size,
      },
    ],
  };
}

function openLightbox(html: string, caption: string) {
  const box = document.getElementById('lightbox');
  const body = document.getElementById('lightbox-body');
  const cap = document.getElementById('lightbox-cap');
  if (!box || !body) return;
  body.innerHTML = html;
  if (cap) cap.textContent = caption;
  box.classList.remove('hidden');
}

function closeLightbox() {
  const box = document.getElementById('lightbox');
  const body = document.getElementById('lightbox-body');
  box?.classList.add('hidden');
  if (body) body.innerHTML = '';
}

async function renderTile(item: ShareFileItem, index: number): Promise<HTMLElement> {
  const tile = document.createElement('article');
  tile.className = 'view-tile';
  tile.dataset.index = String(index);

  const media = document.createElement('div');
  media.className = 'view-tile-media';
  media.innerHTML = `<span class="view-tile-ph">…</span>`;

  const foot = document.createElement('div');
  foot.className = 'view-tile-foot';
  foot.innerHTML = `
    <p class="view-tile-name">${escapeHtml(item.name)}</p>
    <button type="button" class="app-btn-text view-dl">Download</button>
  `;

  tile.appendChild(media);
  tile.appendChild(foot);

  foot.querySelector('.view-dl')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await downloadShareItem(item);
    } catch (err) {
      alert('Download failed: ' + (err instanceof Error ? err.message : err));
    }
  });

  const image = isImageMime(item.mime, item.name);
  const video = isVideoMime(item.mime, item.name);

  if (image || video) {
    try {
      const url = await previewObjectUrl(item);
      objectUrls.push(url);
      if (image) {
        media.innerHTML = `<img src="${url}" alt="" loading="lazy" />`;
        tile.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.view-dl')) return;
          openLightbox(`<img src="${url}" alt="" />`, item.name);
        });
      } else {
        media.innerHTML = `<video src="${url}" muted playsinline preload="metadata"></video>
          <span class="view-tile-badge">Video</span>`;
        tile.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.view-dl')) return;
          openLightbox(
            `<video src="${url}" controls autoplay playsinline></video>`,
            item.name
          );
        });
      }
    } catch (err) {
      console.error(err);
      media.innerHTML = `<span class="view-tile-ph">Failed</span>`;
    }
  } else {
    media.innerHTML = `<span class="view-tile-ph">FILE</span>`;
    tile.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('.view-dl')) return;
      try {
        await downloadShareItem(item);
      } catch (err) {
        alert('Download failed: ' + (err instanceof Error ? err.message : err));
      }
    });
  }

  return tile;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function init() {
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  const payload = parseShareFragment(window.location.hash);
  if (!payload) {
    setHead('Invalid link', 'This share link is missing or corrupted.');
    showError('No share payload in URL.');
    return;
  }

  const { title, files } = filesFromPayload(payload);
  if (!files.length) {
    setHead(title, 'This folder is empty.');
    return;
  }

  setHead(
    title,
    `${files.length} item${files.length === 1 ? '' : 's'} · preview decrypts in your browser`
  );

  const grid = document.getElementById('view-grid');
  if (!grid) return;

  // Progressive tiles
  for (let i = 0; i < files.length; i++) {
    const tile = await renderTile(files[i], i);
    grid.appendChild(tile);
  }
}

init().catch((e) => {
  console.error(e);
  showError(e instanceof Error ? e.message : String(e));
});

window.addEventListener('pagehide', () => {
  for (const u of objectUrls) URL.revokeObjectURL(u);
});
