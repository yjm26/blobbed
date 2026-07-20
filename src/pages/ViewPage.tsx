import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { parseLiveFolderFragment, parseShareFragment } from '../../scripts/share';
import {
  fetchLiveFolderShare,
  liveFolderItemsToShareItems,
} from '../../scripts/live-share-view';
import {
  previewObjectUrl,
  downloadShareItem,
  isImageMime,
  isVideoMime,
} from '../../scripts/preview';
import type { ShareFileItem, SharePayload } from '../../scripts/types';
import MediaLightbox, {
  type MediaLightboxState,
} from '../components/feature/media/MediaLightbox';
import AegisLogo from '../components/shared/AegisLogo';

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

function fileKindLabel(item: ShareFileItem): string {
  if (isImageMime(item.mime, item.name)) return 'Image';
  if (isVideoMime(item.mime, item.name)) return 'Video';
  return 'File';
}

function shortName(name: string): string {
  if (name.length <= 34) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 8 ? name.slice(dot) : '';
  const base = ext ? name.slice(0, dot) : name;
  return `${base.slice(0, 12)}…${base.slice(-6)}${ext}`;
}

export default function ViewPage() {
  const loc = useLocation();
  const [title, setTitle] = useState('Shared');
  const [sub, setSub] = useState('Decrypting in your browser…');
  const [error, setError] = useState('');
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [isLiveFolder, setIsLiveFolder] = useState(false);
  const [shareLabel, setShareLabel] = useState('Shared');
  const [itemCount, setItemCount] = useState(0);
  const [lightbox, setLightbox] = useState<MediaLightboxState | null>(null);

  useEffect(() => {
    const objectUrls: string[] = [];
    let cancelled = false;

    (async () => {
      setError('');
      const hash = loc.hash || window.location.hash;
      let t = 'Shared';
      let files: ShareFileItem[] = [];
      const liveRef = parseLiveFolderFragment(hash);
      setIsLiveFolder(Boolean(liveRef));
      setShareLabel(liveRef ? 'Live folder' : 'Shared');
      if (liveRef) {
        setTitle('Live folder');
        setSub('Loading current folder contents…');
        const live = await fetchLiveFolderShare(liveRef.shareId);
        files = await liveFolderItemsToShareItems(live, liveRef.folderKey);
        t = live.name || 'Live folder';
        setSub('This link stays current as the owner adds or removes files. Keys stay in the URL fragment.');
      } else {
        const payload = parseShareFragment(hash);
        if (!payload) {
          setTitle('Invalid link');
          setSub('This share link is missing or corrupted.');
          setError('No share payload in URL.');
          return;
        }
        const snap = filesFromPayload(payload);
        setShareLabel(payload.type === 'folder' ? 'Shared folder' : 'Shared file');
        t = snap.title;
        files = snap.files;
        setSub(
          files.length
            ? 'This share decrypts locally in your browser. The server never receives the file key.'
            : 'This folder is empty.'
        );
      }
      if (!files.length) {
        setTitle(t);
        setItemCount(0);
        setTiles([]);
        return;
      }
      setTitle(t);
      setItemCount(files.length);
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
        <Link to="/" className="app-brand" aria-label="Aegis home">
          <AegisLogo variant="horizontal" />
        </Link>
        <div className="app-top-right">
          <Link to="/" className="app-link">
            Home
          </Link>
        </div>
      </header>


      <main className="view-main app-reveal app-reveal-2">
        <header className="view-head">
          <p className="view-kicker">{shareLabel}</p>
          <h1 className="view-title">{title}</h1>
          <div className="view-meta" aria-label="Share details">
            <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
            <span>{isLiveFolder ? 'Live folder' : 'Snapshot'}</span>
            <span>Browser decrypt</span>
          </div>
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
                  <div className="view-tile-copy">
                    <p className="view-tile-name" title={item.name}>{shortName(item.name)}</p>
                    <p className="view-tile-kind">{fileKindLabel(item)}</p>
                  </div>
                  <button
                    type="button"
                    className="view-dl"
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
