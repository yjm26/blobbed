import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  disconnectWallet,
  getConnectedWallet,
  hasAppSession,
} from '../../scripts/aptos-client';
import { uploadFile } from '../../scripts/upload';
import {
  createFolder,
  listFiles,
  listFolders,
  listAllFiles,
  removeFile,
  deleteFolder,
  getFolder,
  countFilesInFolder,
  hydrateLibrary,
  getLibraryBackend,
  setLibraryAuthWallet,
  ensureLibrarySession,
  clearLibrarySession,
} from '../../scripts/library-store';
import {
  generateFileShareLink,
  generateFolderShareLink,
  fileToShareItemAsync,
} from '../../scripts/share';
import {
  previewObjectUrl,
  isImageMime,
  isVideoMime,
} from '../../scripts/preview';
import type { FileMetadata, FolderMetadata } from '../../scripts/types';
import {
  ensureVaultUnlocked,
  migratePlainKeys,
  countKeyEncodings,
  isVaultUnlocked,
  clearVaultSession,
  openThumb,
} from '../../scripts/vault';
import BrandLoader from '../components/shared/BrandLoader';
import MediaLightbox, {
  type MediaLightboxState,
} from '../components/feature/media/MediaLightbox';
import ShareSheet, { type ShareSheetState } from '../components/feature/share/ShareSheet';
import UploadQueuePanel, { type QueueJob } from '../components/feature/upload/UploadQueuePanel';
import FilterMenu, {
  type FileKindFilter,
  type SortKey,
} from '../components/shared/FilterMenu';

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

type DialogState =
  | { type: 'rename-file'; fileId: string; currentName: string }
  | null
  | { type: 'folder' }
  | { type: 'delete'; fileId: string; name: string }
  | { type: 'delete-folder'; folderId: string; name: string; fileCount: number };

export default function DrivePage() {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [wallet, setWallet] = useState<{ address: string; publicKey: string } | null>(
    null
  );
  const [ready, setReady] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<{ msg: string; kind: 'info' | 'err' | 'ok' } | null>(
    null
  );
  const [drag, setDrag] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [folderName, setFolderName] = useState('Album');
  const [dialogBusy, setDialogBusy] = useState(false);
  const thumbs = useRef(new Map<string, string>());
  const [, setThumbTick] = useState(0);
  const [lightbox, setLightbox] = useState<MediaLightboxState | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [vaultOk, setVaultOk] = useState(false);
  const [keyStats, setKeyStats] = useState({ plain: 0, wrapped: 0, plainThumbs: 0, wrappedThumbs: 0 });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      return localStorage.getItem('blobbed_view') === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    try {
      const s = localStorage.getItem('blobbed_sort');
      if (s === 'name' || s === 'size' || s === 'newest') return s;
    } catch { /* */ }
    return 'newest';
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FileKindFilter>('all');
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [queueCollapsed, setQueueCollapsed] = useState(false);
  const queueBusy = useRef(false);
  const pumpQueueRef = useRef<(() => Promise<void>) | null>(null);
  const [shareSheet, setShareSheet] = useState<ShareSheetState | null>(null);
  const [lightboxAlbum, setLightboxAlbum] = useState<string[]>([]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasAppSession()) {
        nav('/gate', { replace: true });
        return;
      }
      const w = await getConnectedWallet();
      if (!w?.address) {
        await disconnectWallet().catch(() => {});
        nav('/gate', { replace: true });
        return;
      }
      if (cancelled) return;
      setWallet(w);
      setLibraryAuthWallet(w);
      setStatus({ msg: 'Syncing library…', kind: 'info' });
      await hydrateLibrary(w.address);
      if (cancelled) return;

      // Unlock vault (memory-only) + library session ticket (1 sign each)
      try {
        setStatus({ msg: 'Unlock vault. Check wallet…', kind: 'info' });
        await ensureVaultUnlocked(w);
        if (cancelled) return;
        setVaultOk(true);
        setStatus({ msg: 'Library session. Check wallet…', kind: 'info' });
        await ensureLibrarySession(w);
        if (cancelled) return;
        const mig = await migratePlainKeys(w);
        if (mig.migrated > 0 || mig.thumbs > 0) {
          setStatus({
            msg: `Secured ${mig.migrated} key(s), ${mig.thumbs} thumb(s)`,
            kind: 'ok',
          });
        }
      } catch (err) {
        setVaultOk(false);
        setStatus({
          msg:
            'Locked: ' +
            (err instanceof Error ? err.message : 'sign rejected') +
            '. Need vault + session signatures',
          kind: 'err',
        });
      }

      if (cancelled) return;
      const backend = getLibraryBackend();
      const stats = countKeyEncodings(listAllFiles(w.address));
      setKeyStats(stats);
      if (backend === 'neon') {
        setStatus((s) =>
          s?.kind === 'err'
            ? s
            : {
                msg: `Library synced (Neon) · keys ${stats.wrapped} wrapped${stats.plain ? ` · ${stats.plain} legacy` : ''}`,
                kind: 'ok',
              }
        );
        setTimeout(() => setStatus((s) => (s?.kind === 'ok' ? null : s)), 2800);
      } else if (backend === 'memory') {
        setStatus({
          msg: 'Library on server memory. Set DATABASE_URL for durable DB',
          kind: 'info',
        });
      } else {
        setStatus({
          msg: 'Library local-only. Set DATABASE_URL on Vercel',
          kind: 'info',
        });
      }
      setReady(true);
      refresh();
    })().catch(() => nav('/gate', { replace: true }));
    return () => {
      cancelled = true;
    };
  }, [nav, refresh]);

  // Focus folder name when modal opens
  useEffect(() => {
    if (dialog?.type === 'folder') {
      const t = window.setTimeout(() => {
        folderInputRef.current?.focus();
        folderInputRef.current?.select();
      }, 30);
      return () => window.clearTimeout(t);
    }
  }, [dialog]);

  // Escape closes dialog
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dialogBusy) setDialog(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, dialogBusy]);

  const owner = wallet?.address || '';

  const folders: FolderMetadata[] = useMemo(() => {
    void tick;
    return owner ? listFolders(owner) : [];
  }, [owner, tick]);

  const files: FileMetadata[] = useMemo(() => {
    void tick;
    let list = owner ? listFiles(owner, folderId) : [];
    const q = filterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((f) => f.originalName.toLowerCase().includes(q));
    }
    if (filterKind === 'image') {
      list = list.filter((f) => isImageMime(f.mimeType, f.originalName));
    } else if (filterKind === 'video') {
      list = list.filter((f) => isVideoMime(f.mimeType, f.originalName));
    } else if (filterKind === 'other') {
      list = list.filter(
        (f) =>
          !isImageMime(f.mimeType, f.originalName) &&
          !isVideoMime(f.mimeType, f.originalName)
      );
    }
    const sorted = [...list];
    if (sortBy === 'name') {
      sorted.sort((a, b) =>
        a.originalName.localeCompare(b.originalName, undefined, { sensitivity: 'base' })
      );
    } else if (sortBy === 'size') {
      sorted.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else {
      sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return sorted;
  }, [owner, folderId, tick, sortBy, filterQuery, filterKind]);

  const previewableIds = useMemo(
    () =>
      files
        .filter(
          (f) =>
            isImageMime(f.mimeType, f.originalName) ||
            isVideoMime(f.mimeType, f.originalName)
        )
        .map((f) => f.id),
    [files]
  );

  const currentFolder = folderId && owner ? getFolder(owner, folderId) : undefined;

  useEffect(() => {
    if (!owner || !wallet) return;
    setKeyStats(countKeyEncodings(listAllFiles(owner)));

    // Decrypt sealed thumbs (bt1.) or legacy data: URLs. Never show ciphertext as img src
    let cancelled = false;
    (async () => {
      for (const f of files) {
        if (cancelled) return;
        if (thumbs.current.has(f.id)) continue;
        if (f.thumbDataUrl) {
          try {
            const url = await openThumb(f.thumbDataUrl, wallet);
            if (cancelled) return;
            if (url) {
              thumbs.current.set(f.id, url);
              setThumbTick((x) => x + 1);
              continue;
            }
          } catch {
            /* fall through */
          }
        }
        // Lazy full decrypt only for legacy images missing thumbs
        if (!isImageMime(f.mimeType, f.originalName)) continue;
        try {
          const item = await fileToShareItemAsync(f, wallet);
          const url = await previewObjectUrl(item);
          if (cancelled) return;
          thumbs.current.set(f.id, url);
          setThumbTick((x) => x + 1);
        } catch {
          /* skip */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files, owner, wallet, tick]);

  function enqueueFiles(list: FileList | File[]) {
    if (!wallet) return;
    const arr = Array.from(list);
    if (!arr.length) return;
    const jobs: QueueJob[] = arr.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      status: 'queued' as const,
      ratio: 0,
      file,
      folderId,
    }));
    setQueue((q) => [...q, ...jobs]);
    setQueueCollapsed(false);
    setStatus({
      msg: `Queued ${jobs.length} file${jobs.length === 1 ? '' : 's'}`,
      kind: 'info',
    });
    window.setTimeout(() => void pumpQueueRef.current?.(), 0);
  }

  const pumpQueue = useCallback(async () => {
    if (!wallet || queueBusy.current) return;
    const snapshot = queue;
    const next = snapshot.find((j) => j.status === 'queued');
    if (!next) return;

    queueBusy.current = true;
    const controller = new AbortController();
    setQueue((q) =>
      q.map((j) =>
        j.id === next.id
          ? { ...j, status: 'running', phase: 'Starting', ratio: 0.02, controller }
          : j
      )
    );

    try {
      if (!isVaultUnlocked(wallet.address)) {
        await ensureVaultUnlocked(wallet);
        setVaultOk(true);
      }
      await uploadFile(next.file, wallet, next.folderId, {
        signal: controller.signal,
        onProgress: (p) => {
          setQueue((q) =>
            q.map((j) =>
              j.id === next.id && j.status === 'running'
                ? { ...j, phase: p.phase, ratio: p.ratio }
                : j
            )
          );
        },
      });
      setQueue((q) =>
        q.map((j) =>
          j.id === next.id
            ? { ...j, status: 'done', phase: 'Done', ratio: 1, controller: undefined }
            : j
        )
      );
      setKeyStats(countKeyEncodings(listAllFiles(wallet.address)));
      refresh();
      setStatus({ msg: `Uploaded ${next.name}`, kind: 'ok' });
    } catch (err) {
      const aborted =
        (err instanceof Error && err.name === 'AbortError') ||
        (err instanceof Error && /cancel/i.test(err.message));
      setQueue((q) =>
        q.map((j) =>
          j.id === next.id
            ? {
                ...j,
                status: aborted ? 'cancelled' : 'error',
                error: aborted
                  ? undefined
                  : err instanceof Error
                    ? err.message
                    : String(err),
                controller: undefined,
              }
            : j
        )
      );
      if (!aborted) {
        setStatus({
          msg: 'Upload failed: ' + (err instanceof Error ? err.message : String(err)),
          kind: 'err',
        });
      }
    } finally {
      queueBusy.current = false;
      // schedule next tick so state commits first
      window.setTimeout(() => {
        void pumpQueueRef.current?.();
      }, 0);
    }
  }, [queue, wallet, refresh]);

  pumpQueueRef.current = pumpQueue;

  useEffect(() => {
    if (queue.some((j) => j.status === 'queued') && !queueBusy.current) {
      void pumpQueue();
    }
  }, [queue, pumpQueue]);

  function handleFiles(list: FileList | File[]) {
    enqueueFiles(list);
  }

  function cancelQueueItem(id: string) {
    setQueue((q) =>
      q.map((j) => {
        if (j.id !== id) return j;
        try {
          j.controller?.abort();
        } catch { /* */ }
        if (j.status === 'queued') return { ...j, status: 'cancelled' };
        if (j.status === 'running') return { ...j, status: 'cancelled' };
        return j;
      })
    );
  }

  function retryQueueItem(id: string) {
    setQueue((q) =>
      q.map((j) =>
        j.id === id
          ? { ...j, status: 'queued', error: undefined, phase: undefined, ratio: 0 }
          : j
      )
    );
  }

  function dismissQueueItem(id: string) {
    setQueue((q) => q.filter((j) => j.id !== id));
  }

  function clearDoneQueue() {
    setQueue((q) => q.filter((j) => j.status === 'queued' || j.status === 'running'));
  }

  function openNewFolder() {
    setFolderName('Album');
    setDialog({ type: 'folder' });
  }

  async function submitNewFolder() {
    if (!owner || dialogBusy) return;
    const name = folderName.trim() || 'Untitled folder';
    setDialogBusy(true);
    try {
      const folder = await createFolder(owner, name);
      setFolderId(folder.id);
      setStatus({ msg: `Folder “${folder.name}” created`, kind: 'ok' });
      setDialog(null);
      refresh();
    } catch (err) {
      setStatus({
        msg: 'Create folder failed: ' + (err instanceof Error ? err.message : String(err)),
        kind: 'err',
      });
    } finally {
      setDialogBusy(false);
    }
  }

  async function onShareFolder() {
    if (!owner || !folderId || !wallet) return;
    const folder = getFolder(owner, folderId);
    if (!folder) return;
    const fl = listFiles(owner, folderId);
    if (!fl.length) {
      setStatus({ msg: 'Folder is empty. Upload something first', kind: 'err' });
      return;
    }
    try {
      setStatus({ msg: 'Building share link…', kind: 'info' });
      const link = await generateFolderShareLink(folder, fl, wallet);
      setShareSheet({
        title: folder.name,
        kind: 'folder',
        link,
        fileCount: fl.length,
        subtitle: 'keys in #fragment',
      });
      setStatus(null);
    } catch (err: unknown) {
      setStatus({
        msg: err instanceof Error ? err.message : 'Share failed',
        kind: 'err',
      });
    }
  }

  async function onShareFile(id: string) {
    if (!wallet) return;
    const file = listAllFiles(owner).find((f) => f.id === id);
    if (!file) return;
    try {
      setStatus({ msg: 'Building share link…', kind: 'info' });
      const link = await generateFileShareLink(file, wallet);
      setShareSheet({
        title: file.originalName,
        kind: 'file',
        link,
        subtitle: formatSize(file.sizeBytes),
      });
      setStatus(null);
    } catch (err) {
      setStatus({
        msg: err instanceof Error ? err.message : 'Share failed',
        kind: 'err',
      });
    }
  }

  function askDelete(id: string) {
    const file = listAllFiles(owner).find((f) => f.id === id);
    setDialog({
      type: 'delete',
      fileId: id,
      name: file?.originalName || 'this file',
    });
  }

  function askDeleteFolder(id: string) {
    const folder = getFolder(owner, id);
    if (!folder) return;
    setDialog({
      type: 'delete-folder',
      folderId: id,
      name: folder.name,
      fileCount: countFilesInFolder(owner, id),
    });
  }

  async function confirmDelete() {
    if (!dialog || dialogBusy) return;

    if (dialog.type === 'delete') {
      setDialogBusy(true);
      try {
        await removeFile(owner, dialog.fileId);
        setStatus({ msg: 'Removed from library', kind: 'ok' });
        setDialog(null);
        refresh();
      } catch (err) {
        setStatus({
          msg: 'Delete failed: ' + (err instanceof Error ? err.message : String(err)),
          kind: 'err',
        });
      } finally {
        setDialogBusy(false);
      }
      return;
    }

    if (dialog.type === 'delete-folder') {
      setDialogBusy(true);
      try {
        const wasOpen = folderId === dialog.folderId;
        await deleteFolder(owner, dialog.folderId);
        if (wasOpen) setFolderId(null);
        setStatus({
          msg:
            dialog.fileCount > 0
              ? `Folder removed · ${dialog.fileCount} file${dialog.fileCount === 1 ? '' : 's'} moved to All files`
              : 'Folder removed',
          kind: 'ok',
        });
        setDialog(null);
        refresh();
      } catch (err) {
        setStatus({
          msg:
            'Delete folder failed: ' +
            (err instanceof Error ? err.message : String(err)),
          kind: 'err',
        });
      } finally {
        setDialogBusy(false);
      }
    }
  }

  async function onPreview(id: string) {
    if (!wallet) return;
    const file = listAllFiles(owner).find((f) => f.id === id);
    if (!file) return;

    const album = previewableIds.length ? previewableIds : [id];
    setLightboxAlbum(album);
    const albumIndex = Math.max(0, album.indexOf(id));

    const kind: 'image' | 'video' = isVideoMime(file.mimeType, file.originalName)
      ? 'video'
      : 'image';

    // Instant open for images if we already have a full-res or thumb URL
    // Prefer decrypt for full quality when thumb is only a data URL JPEG
    const cached = thumbs.current.get(file.id);
    const isDataThumb = cached?.startsWith('data:');
    if (cached && kind === 'image' && !isDataThumb) {
      setLightbox({
        url: cached,
        name: file.originalName,
        kind: 'image',
        index: albumIndex,
        total: album.length,
      });
      return;
    }

    setLightbox({
      url: '',
      name: file.originalName,
      kind,
      loading: true,
      progress: 0.02,
      progressLabel: 'Unlocking key…',
      index: albumIndex,
      total: album.length,
    });

    try {
      const item = await fileToShareItemAsync(file, wallet);
      const url = await previewObjectUrl(item, (p) => {
        const base =
          p.phase === 'download' ? 0 : p.phase === 'decrypt' ? 0.45 : 0.95;
        const span = p.phase === 'download' ? 0.45 : p.phase === 'decrypt' ? 0.5 : 0.05;
        setLightbox((prev) =>
          prev && prev.loading
            ? {
                ...prev,
                progress: base + p.ratio * span,
                progressLabel: p.detail || prev.progressLabel,
              }
            : prev
        );
      });
      if (kind === 'image') {
        thumbs.current.set(file.id, url);
        setThumbTick((t) => t + 1);
      } else {
        if (previewUrlRef.current) {
          try {
            URL.revokeObjectURL(previewUrlRef.current);
          } catch {
            /* ignore */
          }
        }
        previewUrlRef.current = url;
      }
      setLightbox({
        url,
        name: file.originalName,
        kind,
        progress: 1,
        index: albumIndex,
        total: album.length,
      });
    } catch (err) {
      setLightbox({
        url: '',
        name: file.originalName,
        kind,
        error: err instanceof Error ? err.message : String(err),
        index: albumIndex,
        total: album.length,
      });
    }
  }

  function closeLightbox() {
    setLightbox(null);
    setLightboxAlbum([]);
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch {
        /* ignore */
      }
      previewUrlRef.current = null;
    }
  }

  function lightboxNav(dir: -1 | 1) {
    if (!lightboxAlbum.length) return;
    const cur = lightbox?.index ?? 0;
    const next = (cur + dir + lightboxAlbum.length) % lightboxAlbum.length;
    void onPreview(lightboxAlbum[next]);
  }

  function setView(mode: 'list' | 'grid') {
    setViewMode(mode);
    try {
      localStorage.setItem('blobbed_view', mode);
    } catch { /* */ }
  }

  function setSort(s: SortKey) {
    setSortBy(s);
    try {
      localStorage.setItem('blobbed_sort', s);
    } catch { /* */ }
  }


  async function onUnlockVault() {
    if (!wallet) return;
    try {
      setStatus({ msg: 'Unlock keys. Check wallet…', kind: 'info' });
      await ensureVaultUnlocked(wallet, { forcePrompt: true });
      setVaultOk(true);
      setLibraryAuthWallet(wallet);
      await ensureLibrarySession(wallet);
      const mig = await migratePlainKeys(wallet);
      setKeyStats(countKeyEncodings(listAllFiles(wallet.address)));
      setStatus({
        msg:
          mig.migrated > 0
            ? `Vault unlocked · wrapped ${mig.migrated} legacy key(s)`
            : 'Vault unlocked · file keys wallet-wrapped',
        kind: 'ok',
      });
      refresh();
    } catch (err) {
      setVaultOk(false);
      setStatus({
        msg: err instanceof Error ? err.message : 'Unlock failed',
        kind: 'err',
      });
    }
  }

  async function onDisconnect() {
    setWallet(null);
    clearVaultSession();
    clearLibrarySession();
    try {
      await disconnectWallet();
    } catch {
      sessionStorage.removeItem('blobbed_session');
      sessionStorage.removeItem('blobbed_wallet');
      sessionStorage.removeItem('blobbed_wallet_name');
    }
    nav('/gate', { replace: true });
  }

  if (!ready || !wallet) {
    return (
      <BrandLoader
        label="Syncing your library"
        hint="Index + wallet key wrap"
      />
    );
  }

  const chip = wallet.address.slice(0, 6) + '…' + wallet.address.slice(-4);
  const hasContent = files.length > 0 || (folderId === null && folders.length > 0);
  const backend = getLibraryBackend();

  return (
    <div className="app-page app-page--drive">
      <header className="app-top app-reveal app-reveal-1">
        <Link to="/" className="app-brand">
          BLOBBED
        </Link>
        <div className="app-top-right">
          <button
            type="button"
            className={`vault-chip ${vaultOk ? 'is-ok' : 'is-warn'}`}
            title={
              vaultOk
                ? 'File keys wrapped with wallet-derived key'
                : 'Sign with wallet to unlock wrapped keys'
            }
            onClick={() => void onUnlockVault()}
          >
            {vaultOk ? 'Keys wrapped' : 'Unlock keys'}
          </button>
          <span className="wallet-chip" title={wallet.address}>
            {chip}
          </span>
          <Link to="/" className="app-link">
            Home
          </Link>
          <button
            type="button"
            className="app-link app-link-muted"
            onClick={() => void onDisconnect()}
          >
            Disconnect
          </button>
        </div>
      </header>


      <main className="app-shell">
        <aside className="app-rail app-reveal app-reveal-2">
          <button type="button" className="app-btn-ghost app-btn-block" onClick={openNewFolder}>
            New folder
          </button>
          <button
            type="button"
            className="app-upload-cta"
            onClick={() => inputRef.current?.click()}
          >
            Upload files
          </button>
          <nav className="app-rail-nav" aria-label="Library">
            <p className="app-rail-label">Library</p>
            <button
              type="button"
              className={`app-rail-item ${folderId === null ? 'is-active' : ''}`}
              onClick={() => setFolderId(null)}
            >
              All files
            </button>
            <div className="app-folder-nav">
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`app-rail-item ${folderId === f.id ? 'is-active' : ''}`}
                  onClick={() => setFolderId(f.id)}
                >
                  {f.name}
                  <span className="app-rail-count">{countFilesInFolder(owner, f.id)}</span>
                </button>
              ))}
            </div>
          </nav>
          <p className="app-rail-foot">
            Encrypted on device. Blobs on Shelby.
            {backend === 'neon' ? ' Library on Neon.' : backend === 'memory' ? ' Library: server memory.' : ' Library: this device.'}
            {vaultOk ? ' Keys wrapped.' : ''}
          </p>
        </aside>

        <section className="app-stage app-reveal app-reveal-3">
          <div className="app-stage-head">
            <div>
              {folderId ? (
                <button type="button" className="app-back" onClick={() => setFolderId(null)}>
                  ← Library
                </button>
              ) : null}
              <h1 className="app-stage-title">
                {folderId ? currentFolder?.name || 'Folder' : 'Library'}
              </h1>
              <p className="app-stage-sub">
                {folderId
                  ? `${files.length} file${files.length === 1 ? '' : 's'} in this folder`
                  : `${folders.length} folder${folders.length === 1 ? '' : 's'} · ${
                      listFiles(owner, null).length
                    } loose file${listFiles(owner, null).length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="app-stage-actions">
              <div className="app-toolbar" role="group" aria-label="View options">
                <button
                  type="button"
                  className={`app-tool ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setView('list')}
                  title="List view"
                >
                  List
                </button>
                <button
                  type="button"
                  className={`app-tool ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setView('grid')}
                  title="Grid view"
                >
                  Grid
                </button>
                <FilterMenu
                  open={filterOpen}
                  onOpenChange={setFilterOpen}
                  query={filterQuery}
                  onQueryChange={setFilterQuery}
                  kind={filterKind}
                  onKindChange={setFilterKind}
                  sort={sortBy}
                  onSortChange={setSort}
                  resultCount={files.length}
                />
              </div>
              {folderId ? (
                <>
                  <button
                    type="button"
                    className="app-btn-ghost"
                    onClick={() => void onShareFolder()}
                  >
                    Share folder
                  </button>
                  <button
                    type="button"
                    className="app-btn-ghost app-btn-ghost-danger"
                    onClick={() => askDeleteFolder(folderId)}
                  >
                    Delete folder
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="app-btn-ghost"
                onClick={() => inputRef.current?.click()}
              >
                Upload
              </button>
            </div>
          </div>

          <div
            className={`app-drop ${files.length > 0 ? 'app-drop-compact' : ''} ${drag ? 'is-drag' : ''}`}
            tabIndex={0}
            role="button"
            aria-label="Drop files to upload"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
            }}
          >
            <span className="app-drop-title">Drop files here</span>
            <span className="app-drop-hint">
              {folderId
                ? 'Upload into this folder · multi-select ok'
                : 'or click to browse · multi-select ok'}
            </span>
          </div>

          {!folderId && folders.length > 0 ? (
            <div className="drive-folder-grid">
              {folders.map((f) => (
                <div key={f.id} className="drive-folder-card-wrap">
                  <button
                    type="button"
                    className="drive-folder-card"
                    onClick={() => setFolderId(f.id)}
                  >
                    <span className="drive-folder-icon">▢</span>
                    <span className="drive-folder-name">{f.name}</span>
                    <span className="drive-folder-meta">
                      {countFilesInFolder(owner, f.id)} items
                    </span>
                  </button>
                  <button
                    type="button"
                    className="drive-folder-delete"
                    title={`Delete ${f.name}`}
                    aria-label={`Delete folder ${f.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      askDeleteFolder(f.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {files.length > 0 ? (
            <div
              className={
                viewMode === 'grid' ? 'app-file-grid' : 'app-file-list'
              }
            >
              {files.map((f) => {
                const canPreview =
                  isImageMime(f.mimeType, f.originalName) ||
                  isVideoMime(f.mimeType, f.originalName);
                const thumb = thumbs.current.get(f.id);
                const video = isVideoMime(f.mimeType, f.originalName);
                return (
                  <article
                    key={f.id}
                    className={
                      viewMode === 'grid' ? 'app-file-card' : 'app-file-row'
                    }
                  >
                    <button
                      type="button"
                      className="app-file-thumb app-file-thumb-btn"
                      onClick={() => {
                        if (canPreview) void onPreview(f.id);
                      }}
                      disabled={!canPreview}
                      title={canPreview ? 'Preview' : undefined}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" />
                      ) : (
                        <span className="app-file-thumb-ph">
                          {video ? '▶' : canPreview ? '…' : 'FILE'}
                        </span>
                      )}
                      {video ? (
                        <span className="app-file-badge">Video</span>
                      ) : null}
                    </button>
                    <div className="app-file-meta">
                      <h3 className="app-file-name" title={f.originalName}>
                        {f.originalName}
                      </h3>
                      <p className="app-file-sub">
                        {formatSize(f.sizeBytes)} · {(f.createdAt || '').slice(0, 10)}
                      </p>
                    </div>
                    <div className="app-file-actions">
                      {canPreview ? (
                        <button
                          type="button"
                          className="app-btn-text"
                          onClick={() => void onPreview(f.id)}
                        >
                          {video ? 'Play' : 'Preview'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="app-btn-text"
                        onClick={() => void onShareFile(f.id)}
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        className="app-btn-text app-btn-danger"
                        onClick={() => askDelete(f.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {hasContent && files.length === 0 && (filterQuery || filterKind !== 'all') ? (
            <div className="app-empty app-empty--soft">
              <p className="app-empty-title">No matches</p>
              <p className="app-empty-hint">Try another search or clear filters.</p>
              <button
                type="button"
                className="app-btn-ghost"
                onClick={() => {
                  setFilterQuery('');
                  setFilterKind('all');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {!hasContent ? (
            <div className="app-empty">
              <p className="app-empty-title">
                {folderId ? 'This folder is empty' : 'Your library is empty'}
              </p>
              <p className="app-empty-hint">
                {folderId
                  ? 'Drop files above or click Upload to fill this album.'
                  : 'Create a folder for an album, or upload loose files.'}
              </p>
              <div className="app-empty-actions">
                {!folderId ? (
                  <button
                    type="button"
                    className="app-btn-ghost"
                    onClick={openNewFolder}
                  >
                    New folder
                  </button>
                ) : null}
                <button
                  type="button"
                  className="app-upload-cta app-empty-cta"
                  onClick={() => inputRef.current?.click()}
                >
                  Upload files
                </button>
              </div>
            </div>
          ) : folderId && files.length === 0 ? (
            <div className="app-empty app-empty--soft">
              <p className="app-empty-title">No files in this folder</p>
              <p className="app-empty-hint">Drop media here to build the album.</p>
              <button
                type="button"
                className="app-btn-ghost"
                onClick={() => inputRef.current?.click()}
              >
                Upload into folder
              </button>
            </div>
          ) : null}

          {status ? (
            <div className="app-status" data-kind={status.kind} role="status">
              {status.msg}
            </div>
          ) : null}
        </section>
      </main>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="*/*"
        onChange={(e) => {
          if (e.target.files?.length) {
            void handleFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* In-app modal, no browser prompt/confirm */}
      {dialog ? (
        <div
          className="app-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!dialogBusy) setDialog(null);
          }}
        >
          <div
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {dialog.type === 'folder' ? (
              <>
                <h2 id="app-modal-title" className="app-modal-title">
                  New folder
                </h2>
                <p className="app-modal-sub">Name your album or collection</p>
                <label className="app-modal-label" htmlFor="folder-name-input">
                  Folder name
                </label>
                <input
                  id="folder-name-input"
                  ref={folderInputRef}
                  className="app-modal-input"
                  type="text"
                  value={folderName}
                  maxLength={80}
                  autoComplete="off"
                  disabled={dialogBusy}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitNewFolder();
                    }
                  }}
                />
                <div className="app-modal-actions">
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-ghost"
                    disabled={dialogBusy}
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-primary"
                    disabled={dialogBusy}
                    onClick={() => void submitNewFolder()}
                  >
                    {dialogBusy ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </>
            ) : dialog.type === 'delete-folder' ? (
              <>
                <h2 id="app-modal-title" className="app-modal-title">
                  Delete folder?
                </h2>
                <p className="app-modal-sub">
                  <strong className="app-modal-em">{dialog.name}</strong> will be
                  removed.
                  {dialog.fileCount > 0 ? (
                    <>
                      {' '}
                      Its {dialog.fileCount} file
                      {dialog.fileCount === 1 ? '' : 's'} move to{' '}
                      <strong className="app-modal-em">All files</strong> (not
                      deleted from Shelby).
                    </>
                  ) : (
                    <> It’s empty.</>
                  )}
                </p>
                <div className="app-modal-actions">
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-ghost"
                    disabled={dialogBusy}
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-danger"
                    disabled={dialogBusy}
                    onClick={() => void confirmDelete()}
                  >
                    {dialogBusy ? 'Deleting…' : 'Delete folder'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="app-modal-title" className="app-modal-title">
                  Remove file?
                </h2>
                <p className="app-modal-sub">
                  <strong className="app-modal-em">{dialog.name}</strong> will leave
                  your library index. The blob stays on Shelby until it expires.
                </p>
                <div className="app-modal-actions">
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-ghost"
                    disabled={dialogBusy}
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-danger"
                    disabled={dialogBusy}
                    onClick={() => void confirmDelete()}
                  >
                    {dialogBusy ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <MediaLightbox
        state={lightbox}
        onClose={closeLightbox}
        onPrev={
          lightboxAlbum.length > 1 ? () => lightboxNav(-1) : undefined
        }
        onNext={
          lightboxAlbum.length > 1 ? () => lightboxNav(1) : undefined
        }
      />
      <ShareSheet state={shareSheet} onClose={() => setShareSheet(null)} />
      <UploadQueuePanel
        items={queue}
        collapsed={queueCollapsed}
        onToggleCollapse={() => setQueueCollapsed((c) => !c)}
        onCancel={cancelQueueItem}
        onRetry={retryQueueItem}
        onDismiss={dismissQueueItem}
        onClearDone={clearDoneQueue}
      />
    </div>
  );
}
