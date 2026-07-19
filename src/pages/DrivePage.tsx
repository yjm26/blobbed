import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  disconnectWallet,
  getConnectedWallet,
  hasAppSession,
} from '../../scripts/aptos-client';
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
  renameFile,
  renameFolder,
  moveFile,
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
import type { FileMetadata, FolderMetadata, WalletAccount } from '../../scripts/types';
import {
  ensureVaultUnlocked,
  migratePlainKeys,
  countKeyEncodings,
  clearVaultSession,
} from '../../scripts/vault';

import { DriveLayout, DriveTopBar } from '../components/layout';
import {
  DriveHeader,
  DriveDropzone,
  DriveFolderGrid,
  DriveFileList,
  DriveBootError,
  DriveBootProgress,
  DriveBulkBar,
  type BootStepId,
} from '../components/feature/drive';
import TrustPanel from '../components/shared/TrustPanel';
import MediaLightbox, {
  type MediaLightboxState,
} from '../components/feature/media/MediaLightbox';
import ShareSheet, { type ShareSheetState } from '../components/feature/share/ShareSheet';
import UploadQueuePanel from '../components/feature/upload/UploadQueuePanel';
import type { FileKindFilter, SortKey } from '../components/shared/FilterMenu';
import { useQueue } from '../components/hooks/useQueue';
import { useThumbs } from '../components/hooks/useThumbs';
import { useDriveSelection } from '../components/hooks/useDriveSelection';

type DialogState =
  | null
  | { type: 'folder' }
  | { type: 'delete'; fileId: string; name: string }
  | { type: 'delete-folder'; folderId: string; name: string; fileCount: number }
  | { type: 'rename-file'; fileId: string; currentName: string }
  | { type: 'rename-folder'; folderId: string; currentName: string }
  | { type: 'move-file'; fileId: string; name: string };

export default function DrivePage() {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [bootStep, setBootStep] = useState<BootStepId>('vault');
  const [bootDetail, setBootDetail] = useState('Approve Petra if prompted');
  const [renameValue, setRenameValue] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const [folderId, setFolderId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<{
    msg: string;
    kind: 'info' | 'err' | 'ok';
  } | null>(null);
  const [drag, setDrag] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [folderName, setFolderName] = useState('Album');
  const [dialogBusy, setDialogBusy] = useState(false);
  const [lightbox, setLightbox] = useState<MediaLightboxState | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [vaultOk, setVaultOk] = useState(false);
  const [keyStats, setKeyStats] = useState({
    plain: 0,
    wrapped: 0,
    plainThumbs: 0,
    wrappedThumbs: 0,
  });
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
    } catch {
      /* */
    }
    return 'newest';
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FileKindFilter>('all');
  const [shareSheet, setShareSheet] = useState<ShareSheetState | null>(null);
  const [lightboxAlbum, setLightboxAlbum] = useState<string[]>([]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const syncWalletAndLibrary = useCallback(
    async (isRetry = false) => {
      if (isRetry) setIsRetrying(true);
      setLoadingError(null);

      const timeout = (ms: number) =>
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), ms)
        );

      try {
        if (!hasAppSession()) {
          nav('/gate', { replace: true });
          return;
        }

        const w = await Promise.race([getConnectedWallet(), timeout(8000)]);
        if (!w?.address) {
          await disconnectWallet().catch(() => {});
          nav('/gate', { replace: true });
          return;
        }
        if (!w.publicKey) {
          setLoadingError(
            'Wallet public key missing. Disconnect, reconnect Petra, then try again.'
          );
          return;
        }

        setWallet(w);
        setLibraryAuthWallet(w);

        try {
          setBootStep('vault');
          setBootDetail('Sign 1 of 2 — derive vault key (memory only)');
          setStatus({ msg: 'Unlock vault. Check wallet…', kind: 'info' });
          await Promise.race([ensureVaultUnlocked(w), timeout(20000)]);
          setVaultOk(true);

          setBootStep('session');
          setBootDetail('Sign 2 of 2 — library session ticket (~2h)');
          setStatus({ msg: 'Library session. Check wallet…', kind: 'info' });
          await Promise.race([ensureLibrarySession(w), timeout(15000)]);

          setBootStep('library');
          setBootDetail('Fetching your encrypted index…');
          setStatus({ msg: 'Loading library…', kind: 'info' });
          await Promise.race([hydrateLibrary(w.address), timeout(15000)]);

          const mig = await migratePlainKeys(w);
          if (mig.migrated > 0 || mig.thumbs > 0) {
            setStatus({
              msg: `Secured ${mig.migrated} key(s), ${mig.thumbs} thumb(s)`,
              kind: 'ok',
            });
          }
        } catch (err: unknown) {
          setVaultOk(false);
          const msg = err instanceof Error ? err.message : '';
          if (msg === 'Timeout') {
            setLoadingError(
              'Unlock/session timed out. Check Petra popup, then Retry.'
            );
          } else if (/SESSION_CONFIG|Session service unavailable/i.test(msg)) {
            setLoadingError(
              'Server session not configured. Set LIBRARY_SESSION_SECRET on Render, then Retry.'
            );
          } else if (/public key|publicKey/i.test(msg)) {
            setLoadingError(
              'Wallet public key missing. Disconnect, reconnect Petra, then Retry.'
            );
          } else if (/session|sign|auth|rejected|signature/i.test(msg)) {
            setLoadingError(
              msg.length > 8 && msg.length < 140
                ? msg
                : 'Vault or library session failed. Approve Petra popup, then Retry.'
            );
          } else {
            setLoadingError(
              msg && msg.length < 140
                ? msg
                : 'Failed to unlock vault or library session. Check Petra popup and try again.'
            );
          }
          return;
        }

        const backend = getLibraryBackend();
        const stats = countKeyEncodings(listAllFiles(w.address));
        setKeyStats(stats);
        if (backend === 'neon') {
          setStatus({
            msg: `Library synced (Neon) · keys ${stats.wrapped} wrapped${
              stats.plain ? ` · ${stats.plain} legacy` : ''
            }`,
            kind: 'ok',
          });
          setTimeout(() => setStatus((s) => (s?.kind === 'ok' ? null : s)), 2800);
        } else if (backend === 'memory') {
          setStatus({
            msg: 'Library on server memory. Set DATABASE_URL for durable DB',
            kind: 'info',
          });
        }

        setReady(true);
        refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'Timeout') {
          setLoadingError('Sync timeout. Check wallet connection and try again.');
        } else {
          setLoadingError('Failed to sync library. Please try again.');
        }
      } finally {
        setIsRetrying(false);
      }
    },
    [nav, refresh]
  );

  useEffect(() => {
    void syncWalletAndLibrary();
  }, [syncWalletAndLibrary]);

  useEffect(() => {
    if (dialog?.type === 'folder') {
      const t = window.setTimeout(() => {
        folderInputRef.current?.focus();
        folderInputRef.current?.select();
      }, 30);
      return () => window.clearTimeout(t);
    }
  }, [dialog]);

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
        a.originalName.localeCompare(b.originalName, undefined, {
          sensitivity: 'base',
        })
      );
    } else if (sortBy === 'size') {
      sorted.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else {
      sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return sorted;
  }, [owner, folderId, tick, sortBy, filterQuery, filterKind]);

  const looseFileCount = useMemo(() => {
    void tick;
    return owner ? listFiles(owner, null).length : 0;
  }, [owner, tick]);

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

  const currentFolder =
    folderId && owner ? getFolder(owner, folderId) : undefined;

  const {
    queue,
    queueCollapsed,
    setQueueCollapsed,
    enqueueFiles,
    cancelQueueItem,
    retryQueueItem,
    dismissQueueItem,
    clearDoneQueue,
  } = useQueue({
    wallet,
    folderId,
    onStatus: setStatus,
    onUploaded: refresh,
    onVaultOk: () => setVaultOk(true),
    onKeyStats: setKeyStats,
  });

  const { thumbs } = useThumbs(wallet, files, tick);

  const visibleIds = useMemo(() => files.map((f) => f.id), [files]);
  const selection = useDriveSelection(visibleIds);

  useEffect(() => {
    if (!owner || !wallet) return;
    setKeyStats(countKeyEncodings(listAllFiles(owner)));
  }, [owner, wallet, tick]);

  function handleFiles(list: FileList | File[]) {
    enqueueFiles(list);
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
        msg:
          'Create folder failed: ' +
          (err instanceof Error ? err.message : String(err)),
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
        subtitle: `${file.sizeBytes} B`,
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

  function askRenameFile(id: string) {
    const file = listAllFiles(owner).find((f) => f.id === id);
    if (!file) return;
    setRenameValue(file.originalName || '');
    setDialog({ type: 'rename-file', fileId: id, currentName: file.originalName || '' });
  }

  function askRenameFolder(id: string) {
    const folder = getFolder(owner, id);
    if (!folder) return;
    setRenameValue(folder.name);
    setDialog({ type: 'rename-folder', folderId: id, currentName: folder.name });
  }

  function askMoveFile(id: string) {
    const file = listAllFiles(owner).find((f) => f.id === id);
    if (!file) return;
    setDialog({ type: 'move-file', fileId: id, name: file.originalName || 'file' });
  }

  async function submitRename() {
    if (!dialog || dialogBusy || !owner) return;
    const next = renameValue.trim();
    if (!next) return;
    setDialogBusy(true);
    try {
      if (dialog.type === 'rename-file') {
        await renameFile(owner, dialog.fileId, next);
        setStatus({ msg: 'File renamed', kind: 'ok' });
      } else if (dialog.type === 'rename-folder') {
        await renameFolder(owner, dialog.folderId, next);
        setStatus({ msg: 'Folder renamed', kind: 'ok' });
      }
      setDialog(null);
      refresh();
    } catch (err) {
      setStatus({
        msg: 'Rename failed: ' + (err instanceof Error ? err.message : String(err)),
        kind: 'err',
      });
    } finally {
      setDialogBusy(false);
    }
  }

  async function submitMoveFile(targetFolderId: string | null) {
    if (!dialog || dialog.type !== 'move-file' || !owner) return;
    setDialogBusy(true);
    try {
      await moveFile(owner, dialog.fileId, targetFolderId);
      setStatus({ msg: 'File moved', kind: 'ok' });
      setDialog(null);
      refresh();
    } catch (err) {
      setStatus({
        msg: 'Move failed: ' + (err instanceof Error ? err.message : String(err)),
        kind: 'err',
      });
    } finally {
      setDialogBusy(false);
    }
  }

  async function bulkDelete() {
    if (!owner || selection.count === 0) return;
    setBulkBusy(true);
    try {
      for (const id of selection.selectedIds) {
        await removeFile(owner, id);
      }
      setStatus({ msg: `Removed ${selection.count} file(s)`, kind: 'ok' });
      selection.clear();
      refresh();
    } catch (err) {
      setStatus({
        msg: 'Bulk delete failed: ' + (err instanceof Error ? err.message : String(err)),
        kind: 'err',
      });
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkMove(targetFolderId: string | null) {
    if (!owner || selection.count === 0) return;
    setBulkBusy(true);
    try {
      for (const id of selection.selectedIds) {
        await moveFile(owner, id, targetFolderId);
      }
      setStatus({ msg: `Moved ${selection.count} file(s)`, kind: 'ok' });
      selection.clear();
      refresh();
    } catch (err) {
      setStatus({
        msg: 'Bulk move failed: ' + (err instanceof Error ? err.message : String(err)),
        kind: 'err',
      });
    } finally {
      setBulkBusy(false);
    }
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
          msg:
            'Delete failed: ' +
            (err instanceof Error ? err.message : String(err)),
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
              ? `Folder removed · ${dialog.fileCount} file${
                  dialog.fileCount === 1 ? '' : 's'
                } moved to All files`
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

    const kind: 'image' | 'video' = isVideoMime(
      file.mimeType,
      file.originalName
    )
      ? 'video'
      : 'image';

    const cached = thumbs.get(file.id);
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
        const span =
          p.phase === 'download' ? 0.45 : p.phase === 'decrypt' ? 0.5 : 0.05;
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
        thumbs.set(file.id, url);
        /* thumbs map updated */
      } else {
        if (previewUrlRef.current) {
          try {
            URL.revokeObjectURL(previewUrlRef.current);
          } catch {
            /* */
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
        /* */
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
    } catch {
      /* */
    }
  }

  function setSort(s: SortKey) {
    setSortBy(s);
    try {
      localStorage.setItem('blobbed_sort', s);
    } catch {
      /* */
    }
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
    setReady(false);
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
    if (loadingError) {
      return (
        <DriveBootError
          message={loadingError}
          isRetrying={isRetrying}
          onRetry={() => void syncWalletAndLibrary(true)}
          onDisconnect={() => void onDisconnect()}
        />
      );
    }
    return <DriveBootProgress activeId={bootStep} detail={bootDetail} />;
  }

  const hasContent =
    files.length > 0 || (folderId === null && folders.length > 0);
  const backend = getLibraryBackend();
  const railFoot = [
    'Encrypted on device. Blobs on Shelby.',
    backend === 'neon'
      ? 'Library on Neon.'
      : backend === 'memory'
        ? 'Library: server memory.'
        : 'Library: this device.',
    vaultOk ? 'Keys wrapped.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="app-page app-page--drive">
      <DriveTopBar
        address={wallet.address}
        vaultOk={vaultOk}
        onUnlockVault={() => void onUnlockVault()}
        onDisconnect={() => void onDisconnect()}
      />

      <TrustPanel
        context="drive"
        compact
        vaultOk={vaultOk}
        backend={backend}
        keyStats={keyStats}
        onUnlock={() => void onUnlockVault()}
      />

      <DriveLayout
        folders={folders}
        folderId={folderId}
        onSelectAll={() => setFolderId(null)}
        onSelectFolder={setFolderId}
        onNewFolder={openNewFolder}
        onUpload={() => inputRef.current?.click()}
        countInFolder={(id) => countFilesInFolder(owner, id)}
        railFoot={railFoot}
      >
        <DriveHeader
          folderName={folderId ? currentFolder?.name || 'Folder' : null}
          onBackToLibrary={() => setFolderId(null)}
          fileCount={files.length}
          folderCount={folders.length}
          looseFileCount={looseFileCount}
          viewMode={viewMode}
          onViewChange={setView}
          filterOpen={filterOpen}
          onFilterOpenChange={setFilterOpen}
          filterQuery={filterQuery}
          onFilterQueryChange={setFilterQuery}
          filterKind={filterKind}
          onFilterKindChange={setFilterKind}
          sortBy={sortBy}
          onSortChange={setSort}
          onUpload={() => inputRef.current?.click()}
          onShareFolder={() => void onShareFolder()}
          onDeleteFolder={
            folderId ? () => askDeleteFolder(folderId) : undefined
          }
        />

        <DriveDropzone
          compact={files.length > 0}
          dragging={drag}
          hint={
            folderId
              ? 'Upload into this folder · multi-select ok'
              : 'or click to browse · multi-select ok'
          }
          onBrowse={() => inputRef.current?.click()}
          onDrag={setDrag}
          onDropFiles={(fl) => void handleFiles(fl)}
        />

        {!folderId ? (
          <DriveFolderGrid
            folders={folders}
            countInFolder={(id) => countFilesInFolder(owner, id)}
            onOpen={setFolderId}
            onDelete={askDeleteFolder}
            onRename={askRenameFolder}
          />
        ) : null}

        {files.length > 0 ? (
          <div className="drive-select-row">
            <button
              type="button"
              className="app-btn-text"
              onClick={() => selection.selectAll()}
            >
              Select all
            </button>
            {selection.count > 0 ? (
              <button
                type="button"
                className="app-btn-text"
                onClick={() => selection.clear()}
              >
                Clear selection
              </button>
            ) : null}
          </div>
        ) : null}

        <DriveFileList
          files={files}
          viewMode={viewMode}
          thumbs={thumbs}
          selectedIds={selection.selected}
          onToggleSelect={selection.toggle}
          onPreview={(id) => void onPreview(id)}
          onShare={(id) => void onShareFile(id)}
          onDelete={askDelete}
          onRename={askRenameFile}
          onMove={askMoveFile}
        />

        {hasContent &&
        files.length === 0 &&
        (filterQuery || filterKind !== 'all') ? (
          <div className="app-empty app-empty--soft">
            <p className="app-empty-title">No matches</p>
            <p className="app-empty-hint">
              Try another search or clear filters.
            </p>
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
      </DriveLayout>

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
                  <button type="button" className="app-modal-btn app-modal-btn-ghost" disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className="app-modal-btn app-modal-btn-primary" disabled={dialogBusy} onClick={() => void submitNewFolder()}>{dialogBusy ? 'Creating…' : 'Create'}</button>
                </div>
              </>
            ) : dialog.type === 'rename-file' || dialog.type === 'rename-folder' ? (
              <>
                <h2 id="app-modal-title" className="app-modal-title">
                  {dialog.type === 'rename-file' ? 'Rename file' : 'Rename folder'}
                </h2>
                <label className="app-modal-label" htmlFor="rename-input">Name</label>
                <input
                  id="rename-input"
                  className="app-modal-input"
                  type="text"
                  value={renameValue}
                  maxLength={120}
                  autoComplete="off"
                  disabled={dialogBusy}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitRename();
                    }
                  }}
                />
                <div className="app-modal-actions">
                  <button type="button" className="app-modal-btn app-modal-btn-ghost" disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className="app-modal-btn app-modal-btn-primary" disabled={dialogBusy || !renameValue.trim()} onClick={() => void submitRename()}>{dialogBusy ? 'Saving…' : 'Save'}</button>
                </div>
              </>
            ) : dialog.type === 'move-file' ? (
              <>
                <h2 id="app-modal-title" className="app-modal-title">Move file</h2>
                <p className="app-modal-sub">
                  Move <strong className="app-modal-em">{dialog.name}</strong> to…
                </p>
                <div className="app-modal-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <button type="button" className="app-modal-btn app-modal-btn-ghost" disabled={dialogBusy} onClick={() => void submitMoveFile(null)}>All files (root)</button>
                  {folders.map((f) => (
                    <button key={f.id} type="button" className="app-modal-btn app-modal-btn-ghost" disabled={dialogBusy} onClick={() => void submitMoveFile(f.id)}>{f.name}</button>
                  ))}
                  <button type="button" className="app-modal-btn app-modal-btn-ghost" disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                </div>
              </>
            ) : dialog.type === 'delete-folder' ? (
              <>
                <h2 id="app-modal-title" className="app-modal-title">Delete folder?</h2>
                <p className="app-modal-sub">
                  <strong className="app-modal-em">{dialog.name}</strong> will be removed.
                  {dialog.fileCount > 0 ? (
                    <> Its {dialog.fileCount} file{dialog.fileCount === 1 ? '' : 's'} move to <strong className="app-modal-em">All files</strong>.</>
                  ) : (
                    <> It&apos;s empty.</>
                  )}
                </p>
                <div className="app-modal-actions">
                  <button type="button" className="app-modal-btn app-modal-btn-ghost" disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className="app-modal-btn app-modal-btn-danger" disabled={dialogBusy} onClick={() => void confirmDelete()}>{dialogBusy ? 'Deleting…' : 'Delete folder'}</button>
                </div>
              </>
            ) : dialog.type === 'delete' ? (
              <>
                <h2 id="app-modal-title" className="app-modal-title">Remove file?</h2>
                <p className="app-modal-sub">
                  <strong className="app-modal-em">{dialog.name}</strong> will leave your library index. The blob stays on Shelby until it expires.
                </p>
                <div className="app-modal-actions">
                  <button type="button" className="app-modal-btn app-modal-btn-ghost" disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className="app-modal-btn app-modal-btn-danger" disabled={dialogBusy} onClick={() => void confirmDelete()}>{dialogBusy ? 'Removing…' : 'Remove'}</button>
                </div>
              </>
            ) : null}
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
      <DriveBulkBar
        count={selection.count}
        folders={folders.map((f) => ({ id: f.id, name: f.name }))}
        onClear={() => selection.clear()}
        onDelete={() => void bulkDelete()}
        onMove={(fid) => void bulkMove(fid)}
        busy={bulkBusy}
      />

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
