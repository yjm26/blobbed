import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { parseShareFragment } from '../../scripts/share';
import {
  previewObjectUrl,
  downloadShareItem,
  isImageMime,
  isVideoMime,
} from '../../scripts/preview';
import type { ShareFileItem, SharePayload } from '../../scripts/types';
import MediaLightbox, {
  type MediaLightboxState,
} from '../components/MediaLightbox';

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

type TileState = {
  item: ShareFileItem;
  url?: string;
  failed?: boolean;
};

export default function ViewPage() {
  const loc = useLocation();
  const [title, setTitle] = useState('Shared');
  const [sub, setSub] = useState('Decrypting in your browser…');
  const [error, setError] = useState('');
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [lightbox, setLightbox] = useState<MediaLightboxState | null>(null);

  useEffect(() => {
    const objectUrls: string[] = [];
    let cancelled = false;

    (async () => {
      const payload = parseShareFragment(loc.hash || window.location.hash);
      if (!payload) {
        setTitle('Invalid link');
        setSub('This share link is missing or corrupted.');
        setError('No share payload in URL.');
        return;
      }
      const { title: t, files } = filesFromPayload(payload);
      if (!files.length) {
        setTitle(t);
        setSub('This folder is empty.');
        return;
      }
      setTitle(t);
      setSub(
        `${files.length} item${files.length === 1 ? '' : 's'} · decrypts in your browser only`
      );
      setTiles(files.map((item) => ({ item })));

      for (let i = 0; i < files.length; i++) {
        if (cancelled) return;
        const item = files[i];
        const image = isImageMime(item.mime, item.name);
        const video = isVideoMime(item.mime, item.name);
        if (!image && !video) continue;
        try {
          const url = await previewObjectUrl(item);
          objectUrls.push(url);
          if (cancelled) return;
          setTiles((prev) =>
            prev.map((tile, idx) => (idx === i ? { ...tile, url } : tile))
          );
        } catch {
          if (cancelled) return;
          setTiles((prev) =>
            prev.map((tile, idx) => (idx === i ? { ...tile, failed: true } : tile))
          );
        }
      }
    })().catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });

    return () => {
      cancelled = true;
      for (const u of objectUrls) URL.revokeObjectURL(u);
    };
  }, [loc.hash]);

  return (
    <div className="app-page view-page">
      <header className="app-top app-reveal app-reveal-1">
        <Link to="/" className="app-brand">
          BLOBBED
        </Link>
        <div className="app-top-right">
          <span className="wallet-chip">{title.slice(0, 24)}</span>
          <Link to="/" className="app-link">
            Home
          </Link>
        </div>
      </header>


      <main className="view-main app-reveal app-reveal-2">
        <header className="view-head">
          <h1 className="view-title">{title}</h1>
          <p className="view-sub">{sub}</p>
        </header>

        {error ? <div className="view-error">{error}</div> : null}

        <div className="view-grid">
          {tiles.map(({ item, url, failed }, index) => {
            const image = isImageMime(item.mime, item.name);
            const video = isVideoMime(item.mime, item.name);
            return (
              <article
                key={`${item.n}-${index}`}
                className="view-tile"
                onClick={() => {
                  if (!url) {
                    if (!image && !video) {
                      void downloadShareItem(item).catch((err) =>
                        alert(
                          'Download failed: ' +
                            (err instanceof Error ? err.message : String(err))
                        )
                      );
                    }
                    return;
                  }
                  setLightbox({
                    url,
                    name: item.name,
                    kind: video ? 'video' : 'image',
                  });
                }}
              >
                <div className="view-tile-media">
                  {url && image ? (
                    <img src={url} alt="" loading="lazy" />
                  ) : url && video ? (
                    <>
                      <video src={url} muted playsInline preload="metadata" />
                      <span className="view-tile-badge">Video</span>
                    </>
                  ) : failed ? (
                    <span className="view-tile-ph">Failed</span>
                  ) : image || video ? (
                    <span className="view-tile-ph">…</span>
                  ) : (
                    <span className="view-tile-ph">FILE</span>
                  )}
                </div>
                <div className="view-tile-foot">
                  <p className="view-tile-name">{item.name}</p>
                  <button
                    type="button"
                    className="app-btn-text view-dl"
                    onClick={(e) => {
                      e.stopPropagation();
                      void downloadShareItem(item).catch((err) =>
                        alert(
                          'Download failed: ' +
                            (err instanceof Error ? err.message : String(err))
                        )
                      );
                    }}
                  >
                    Download
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      <MediaLightbox state={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
