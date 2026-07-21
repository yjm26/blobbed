import React, { useEffect, useMemo, useState } from 'react';
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

type DownloadStatus = {
  msg: string;
  kind: 'info' | 'err' | 'ok';
};

type ViewMode = 'grid' | 'list';
type KindFilter = 'all' | 'image' | 'video' | 'file';
type ShareSort = 'name' | 'size' | 'type';

const VIEW_META_BADGE_CLASS =
  'rounded-full border border-[color-mix(in_oklch,var(--border,#2a2a2a)_76%,var(--text,#fff))] bg-[color-mix(in_oklch,var(--surface,#111)_72%,transparent)] px-3 py-2 text-[0.68rem] uppercase tracking-[0.08em] text-[color-mix(in_oklch,var(--text,#fff)_74%,transparent)]';

const VIEW_TILE_CLASS =
  'group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--border,#2a2a2a)] bg-[radial-gradient(circle_at_10%_0%,oklch(0.34_0.05_190_/_0.12),transparent_14rem),color-mix(in_oklch,var(--surface,#111)_78%,transparent)] shadow-[0_18px_48px_rgba(0,0,0,0.20)] transition-[border-color,background,transform] duration-150 hover:-translate-y-px hover:border-[color-mix(in_oklch,var(--text,#fff)_34%,var(--border,#333))] hover:bg-[color-mix(in_oklch,var(--surface,#111)_92%,var(--text,#fff))] focus-within:border-white/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

const VIEW_LIST_TILE_CLASS =
  'group grid cursor-pointer grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-[var(--border,#2a2a2a)] bg-[color-mix(in_oklch,var(--surface,#111)_78%,transparent)] p-3 transition-[border-color,background] duration-150 hover:border-white/22 hover:bg-white/[0.025] max-[720px]:grid-cols-1 motion-reduce:transition-none';

const VIEW_PLACEHOLDER_CLASS =
  'grid gap-1 px-4 text-center text-[0.72rem] uppercase tracking-[0.12em] text-[color-mix(in_oklch,var(--text-muted,#666)_82%,var(--text,#fff))]';

const VIEW_MEDIA_OBJECT_CLASS = 'h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100';

const VIEW_DOWNLOAD_BUTTON_CLASS =
  'min-h-11 w-full cursor-pointer appearance-none rounded-full border border-[color-mix(in_oklch,var(--border,#2a2a2a)_68%,var(--text,#fff))] bg-white/[0.02] px-4 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text,#fff)] transition-[background,color,border-color] duration-150 hover:border-[var(--text,#fff)] hover:bg-[var(--text,#fff)] hover:text-[var(--bg,#0a0a0a)] motion-reduce:transition-none';

const VIEW_TOOL_INPUT_CLASS =
  'min-h-11 rounded-full border border-white/10 bg-white/[0.035] px-4 text-[0.82rem] text-white/84 outline-none transition-[border-color,background] duration-150 placeholder:text-white/34 focus:border-white/24 focus:bg-white/[0.055] motion-reduce:transition-none';

function fileKindId(item: ShareFileItem): KindFilter {
  if (isImageMime(item.mime, item.name)) return 'image';
  if (isVideoMime(item.mime, item.name)) return 'video';
  return 'file';
}

function fileKindLabel(item: ShareFileItem): string {
  const kind = fileKindId(item);
  if (kind === 'image') return 'Image';
  if (kind === 'video') return 'Video';
  return 'File';
}

function fileTypeSummary(items: ShareFileItem[]): string {
  const counts = items.reduce(
    (acc, item) => {
      acc[fileKindId(item)] += 1;
      return acc;
    },
    { image: 0, video: 0, file: 0 } as Record<Exclude<KindFilter, 'all'>, number>
  );
  const parts = [
    counts.image ? `${counts.image} image${counts.image === 1 ? '' : 's'}` : '',
    counts.video ? `${counts.video} video${counts.video === 1 ? '' : 's'}` : '',
    counts.file ? `${counts.file} file${counts.file === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'No files';
}

function formatShareSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const precision = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unit]}`;
}

function shortName(name: string): string {
  if (name.length <= 42) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 8 ? name.slice(dot) : '';
  const base = ext ? name.slice(0, dot) : name;
  return `${base.slice(0, 16)}…${base.slice(-8)}${ext}`;
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [sortBy, setSortBy] = useState<ShareSort>('name');
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(null);

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
        setSub('Files decrypt in your browser. This live link stays current as the owner adds or removes files, and the key stays in the URL fragment.');
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
            ? 'Files decrypt in your browser. The server never receives the file key because it stays in the URL fragment.'
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

  const allItems = useMemo(() => tiles.map((tile) => tile.item), [tiles]);
  const totalSize = useMemo(
    () => allItems.reduce((sum, item) => sum + (item.size || 0), 0),
    [allItems]
  );
  const typeSummary = useMemo(() => fileTypeSummary(allItems), [allItems]);
  const visibleTiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = tiles.filter((tile) => {
      const item = tile.item;
      if (kindFilter !== 'all' && fileKindId(item) !== kindFilter) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === 'size') return (b.item.size || 0) - (a.item.size || 0);
      if (sortBy === 'type') {
        const type = fileKindLabel(a.item).localeCompare(fileKindLabel(b.item));
        if (type !== 0) return type;
      }
      return a.item.name.localeCompare(b.item.name, undefined, { sensitivity: 'base' });
    });
  }, [tiles, query, kindFilter, sortBy]);

  async function handleDownload(item: ShareFileItem) {
    setDownloadStatus({ msg: 'Preparing download…', kind: 'info' });
    try {
      await downloadShareItem(item);
      setDownloadStatus({ msg: 'Download started', kind: 'ok' });
    } catch (err) {
      setDownloadStatus({
        msg: 'Download failed: ' + (err instanceof Error ? err.message : String(err)),
        kind: 'err',
      });
    }
  }

  function openPreview(tile: TileState) {
    const { item, url } = tile;
    const image = isImageMime(item.mime, item.name);
    const video = isVideoMime(item.mime, item.name);
    if (!url) {
      if (!image && !video) void handleDownload(item);
      return;
    }
    setLightbox({
      url,
      name: item.name,
      kind: video ? 'video' : 'image',
    });
  }

  function renderPreview(tile: TileState, compact = false) {
    const { item, url, failed } = tile;
    const image = isImageMime(item.mime, item.name);
    const video = isVideoMime(item.mime, item.name);
    const boxClass = compact
      ? 'relative flex aspect-[4/3] h-full min-h-[5.8rem] items-center justify-center overflow-hidden rounded-xl bg-[#0f0f0f] max-[720px]:aspect-video'
      : 'relative flex aspect-square items-center justify-center overflow-hidden bg-[#0f0f0f]';

    return (
      <div className={boxClass}>
        {url && image ? (
          <img className={VIEW_MEDIA_OBJECT_CLASS} src={url} alt="" loading="lazy" />
        ) : url && video ? (
          <>
            <video className={VIEW_MEDIA_OBJECT_CLASS} src={url} muted playsInline preload="metadata" />
            <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[0.58rem] uppercase tracking-[0.1em] text-white backdrop-blur-sm">Video</span>
          </>
        ) : failed ? (
          <span className={VIEW_PLACEHOLDER_CLASS}>
            <span>Preview unavailable</span>
            <span className="text-[0.64rem] normal-case tracking-normal text-white/42">Download still works</span>
          </span>
        ) : image || video ? (
          <span className={VIEW_PLACEHOLDER_CLASS}>Loading preview…</span>
        ) : (
          <span className={VIEW_PLACEHOLDER_CLASS}>File</span>
        )}
        {url ? (
          <span className="pointer-events-none absolute inset-x-3 bottom-3 rounded-full bg-black/65 px-3 py-1.5 text-center text-[0.62rem] uppercase tracking-[0.1em] text-white/0 opacity-0 backdrop-blur-md transition-[opacity,color] duration-150 group-hover:text-white/82 group-hover:opacity-100 motion-reduce:transition-none">
            Preview
          </span>
        ) : null}
      </div>
    );
  }

  function renderMeta(item: ShareFileItem) {
    return (
      <p className="mt-[0.28rem] text-[0.7rem] uppercase tracking-[0.08em] text-[color-mix(in_oklch,var(--text-muted,#888)_80%,transparent)]">
        {fileKindLabel(item)} · {formatShareSize(item.size || 0)}
      </p>
    );
  }

  return (
    <div className="flex min-h-[100svh] min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[color-mix(in_oklch,var(--bg)_94%,transparent)] px-4 py-4 text-[var(--text)] backdrop-blur-xl sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex shrink-0 items-center leading-none text-[var(--text)] no-underline" aria-label="Aegis home">
          <AegisLogo variant="horizontal" className="!w-[clamp(7.25rem,9vw,9rem)]" />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="text-[0.68rem] uppercase tracking-[0.12em] text-white/42 max-[560px]:hidden">Secure share</span>
          <Link to="/" className="min-h-10 rounded-full border border-white/10 px-4 py-2 text-[0.75rem] uppercase tracking-[0.12em] text-[var(--text)] no-underline transition-[border-color,background,opacity] duration-150 hover:border-white/24 hover:bg-white/[0.04] motion-reduce:transition-none">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[76rem] px-[clamp(1.15rem,4vw,2.75rem)] pb-20 pt-8 sm:pt-[clamp(3rem,7vw,5rem)]">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_10%_0%,oklch(0.34_0.05_190_/_0.18),transparent_18rem),radial-gradient(circle_at_92%_8%,oklch(0.32_0.035_250_/_0.16),transparent_16rem),rgba(255,255,255,0.012)] p-[clamp(1.25rem,3vw,2rem)] shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="grid max-w-[50rem] gap-3">
            <p className="mb-[0.15rem] text-[0.72rem] uppercase tracking-[0.18em] text-[color-mix(in_oklch,var(--text-muted,#888)_88%,transparent)]">{shareLabel}</p>
            <h1 className="m-0 text-[clamp(2.35rem,5vw,4.4rem)] font-[250] leading-[0.98] tracking-[-0.055em]">{title}</h1>
            <div className="mt-1 flex flex-wrap gap-2" aria-label="Share details">
              <span className={VIEW_META_BADGE_CLASS}>{itemCount} file{itemCount === 1 ? '' : 's'}</span>
              <span className={VIEW_META_BADGE_CLASS}>{isLiveFolder ? 'Live folder' : 'Snapshot'}</span>
              <span className={VIEW_META_BADGE_CLASS}>Browser decrypted</span>
              <span className={VIEW_META_BADGE_CLASS}>{formatShareSize(totalSize)}</span>
              <span className={VIEW_META_BADGE_CLASS}>{typeSummary}</span>
            </div>
            <p className="mt-1 max-w-[42rem] text-[0.95rem] leading-[1.65] text-[color-mix(in_oklch,var(--text-muted,#888)_90%,var(--text,#fff))]">{sub}</p>
          </div>
        </header>

        {error ? <div className="mt-6 rounded-2xl border border-red-300/15 bg-red-950/20 p-4 text-sm text-[#e8a0a0]">{error}</div> : null}

        <section className="mt-[clamp(1.5rem,4vw,2.4rem)]" aria-labelledby="share-files-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="share-files-title" className="m-0 text-[0.8rem] uppercase tracking-[0.16em] text-white/72">Files</h2>
              <p className="m-0 mt-1 text-sm text-white/45">Showing {visibleTiles.length} of {tiles.length}</p>
            </div>
            <div className="grid flex-1 grid-cols-[minmax(12rem,1fr)_auto_auto_auto] items-center gap-2 max-[860px]:grid-cols-2 max-[560px]:grid-cols-1 sm:max-w-[46rem]">
              <label className="min-w-0">
                <span className="sr-only">Search files</span>
                <input
                  className={`${VIEW_TOOL_INPUT_CLASS} w-full`}
                  type="search"
                  value={query}
                  placeholder="Search files"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">Type filter</span>
                <select className={VIEW_TOOL_INPUT_CLASS} value={kindFilter} onChange={(event) => setKindFilter(event.target.value as KindFilter)}>
                  <option value="all">All types</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="file">Files</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Sort files</span>
                <select className={VIEW_TOOL_INPUT_CLASS} value={sortBy} onChange={(event) => setSortBy(event.target.value as ShareSort)}>
                  <option value="name">Sort: Name</option>
                  <option value="size">Sort: Size</option>
                  <option value="type">Sort: Type</option>
                </select>
              </label>
              <div className="flex min-h-11 overflow-hidden rounded-full border border-white/10 bg-white/[0.035] p-1" aria-label="View mode">
                <button type="button" className={`rounded-full px-3 text-[0.68rem] uppercase tracking-[0.1em] transition-colors duration-150 ${viewMode === 'grid' ? 'bg-white text-black' : 'text-white/58 hover:text-white'}`} onClick={() => setViewMode('grid')}>Grid</button>
                <button type="button" className={`rounded-full px-3 text-[0.68rem] uppercase tracking-[0.1em] transition-colors duration-150 ${viewMode === 'list' ? 'bg-white text-black' : 'text-white/58 hover:text-white'}`} onClick={() => setViewMode('list')}>List</button>
              </div>
            </div>
          </div>

          {downloadStatus ? (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                downloadStatus.kind === 'ok'
                  ? 'border-emerald-300/15 bg-emerald-950/15 text-emerald-100/72'
                  : downloadStatus.kind === 'err'
                    ? 'border-red-300/15 bg-red-950/20 text-[#e8a0a0]'
                    : 'border-white/8 bg-white/[0.025] text-white/58'
              }`}
              role="status"
            >
              {downloadStatus.msg}
            </div>
          ) : null}

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
              {visibleTiles.map((tile, index) => (
                <article
                  key={`${tile.item.n}-${index}`}
                  className={VIEW_TILE_CLASS}
                  onClick={() => openPreview(tile)}
                >
                  {renderPreview(tile)}
                  <div className="grid gap-3 border-t border-[var(--border,#2a2a2a)] p-4">
                    <div className="min-w-0">
                      <p className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] text-[color-mix(in_oklch,var(--text,#fff)_90%,transparent)]" title={tile.item.name}>{shortName(tile.item.name)}</p>
                      {renderMeta(tile.item)}
                    </div>
                    <button
                      type="button"
                      className={VIEW_DOWNLOAD_BUTTON_CLASS}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownload(tile.item);
                      }}
                    >
                      Download
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleTiles.map((tile, index) => (
                <article
                  key={`${tile.item.n}-${index}`}
                  className={VIEW_LIST_TILE_CLASS}
                  onClick={() => openPreview(tile)}
                >
                  {renderPreview(tile, true)}
                  <div className="min-w-0">
                    <p className="m-0 break-words text-[0.95rem] text-white/90" title={tile.item.name}>{tile.item.name}</p>
                    {renderMeta(tile.item)}
                  </div>
                  <button
                    type="button"
                    className={`${VIEW_DOWNLOAD_BUTTON_CLASS} min-w-36 max-[720px]:w-full`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownload(tile.item);
                    }}
                  >
                    Download
                  </button>
                </article>
              ))}
            </div>
          )}

          {!visibleTiles.length ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.018] p-8 text-center text-sm text-white/48">
              No files match this filter.
            </div>
          ) : null}
        </section>
      </main>

      <MediaLightbox state={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
