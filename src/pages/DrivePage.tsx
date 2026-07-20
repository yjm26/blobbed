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
  fileToShareItemAsync,
} from '../../scripts/share';
import { prepareLiveFolderShare } from '../../scripts/live-folder-share';
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
  DriveEmptyState,
  DriveSectionHeader,
  FilesToolbar,
  DriveDetailsPanel,
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

const MODAL_BACKDROP_CLASS =
  'fixed inset-0 z-[80] grid place-items-center bg-black/70 p-5 backdrop-blur-md transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none';

const MODAL_VISIBLE_BACKDROP_CLASS = 'opacity-100';
const MODAL_HIDDEN_BACKDROP_CLASS = 'opacity-0';

const MODAL_CARD_CLASS =
  'w-[min(100%,22.5rem)] rounded-[14px] border border-white/10 bg-[#121212] px-[1.35rem] pb-5 pt-[1.35rem] shadow-[0_24px_64px_rgba(0,0,0,0.55)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none';

const MODAL_VISIBLE_CARD_CLASS = 'translate-y-0 scale-100 opacity-100';
const MODAL_HIDDEN_CARD_CLASS = 'translate-y-2 scale-95 opacity-0';

const MODAL_TITLE_CLASS =
  'm-0 text-[1.05rem] font-medium tracking-[-0.02em] text-[#f2f2f2]';

const MODAL_SUB_CLASS = 'mt-1 text-[0.8125rem] leading-[1.45] text-[#8a8a8a]';

const MODAL_EM_CLASS = 'font-medium text-[#e8e8e8]';

const MODAL_LABEL_CLASS =
  'mb-1 mt-[1.15rem] block text-[0.6875rem] uppercase tracking-[0.1em] text-[#6e6e6e]';

const MODAL_INPUT_CLASS =
  'w-full appearance-none rounded-[10px] border border-white/10 bg-[#0a0a0a] px-[0.9rem] py-3 text-[0.9375rem] text-[#f5f5f5] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[rgba(200,200,255,0.35)] focus:shadow-[0_0_0_3px_rgba(180,180,255,0.08)] disabled:opacity-55 motion-reduce:transition-none';

const MODAL_ACTIONS_CLASS = 'mt-5 flex justify-end gap-2';

const MODAL_ACTIONS_STACK_CLASS = 'mt-5 flex flex-col items-stretch gap-2';

const MODAL_BUTTON_BASE_CLASS =
  'cursor-pointer appearance-none rounded-full px-[1.05rem] py-[0.55rem] text-[0.8125rem] font-medium transition-[opacity,background,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';

const MODAL_BUTTON_GHOST_CLASS = `${MODAL_BUTTON_BASE_CLASS} border border-white/10 bg-transparent text-[#bdbdbd] hover:border-white/20 hover:text-white`;
const MODAL_BUTTON_PRIMARY_CLASS = `${MODAL_BUTTON_BASE_CLASS} border border-[#f0f0f0] bg-[#f0f0f0] text-[#0a0a0a] hover:opacity-90`;
const MODAL_BUTTON_DANGER_CLASS = `${MODAL_BUTTON_BASE_CLASS} border border-[#5a2828] bg-[#3a1818] text-[#f0c4c4] hover:bg-[#4a1e1e]`;

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
  const [dialogVisible, setDialogVisible] = useState(false);
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
            msg: `Library synced · ${stats.wrapped} protected key${stats.wrapped === 1 ? '' : 's'}${
              stats.plain ? ` · ${stats.plain} legacy item${stats.plain === 1 ? '' : 's'}` : ''
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
    setDialogVisible(false);
    const raf = window.requestAnimationFrame(() => setDialogVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dialogBusy) setDialog(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, dialogBusy]);

  useEffect(() => {
    if (!dialog) setDialogVisible(false);
  }, [dialog]);

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

  const visibleFolders = useMemo(() => {
    if (folderId) return [];
    const q = filterQuery.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(q));
  }, [folderId, folders, filterQuery]);

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
  const selectedFiles = useMemo(
    () => files.filter((file) => selection.selected.has(file.id)),
    [files, selection.selected]
  );
  const allFiles = useMemo(() => {
    void tick;
    return owner ? listAllFiles(owner) : [];
  }, [owner, tick]);
  const totalBytes = useMemo(
    () => allFiles.reduce((sum, file) => sum + (file.sizeBytes || 0), 0),
    [allFiles]
  );

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
      setStatus({ msg: 'Preparing live folder link…', kind: 'info' });
      const live = await prepareLiveFolderShare(owner, wallet, folder, fl);
      refresh();
      setShareSheet({
        title: folder.name,
        kind: 'folder',
        link: live.link,
        fileCount: fl.length,
        subtitle: live.filesWrapped > 0 ? `live link · wrapped ${live.filesWrapped}` : 'live link',
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
      setStatus({ msg: 'Unlock encryption. Check wallet…', kind: 'info' });
      await ensureVaultUnlocked(wallet, { forcePrompt: true });
      setVaultOk(true);
      setLibraryAuthWallet(wallet);
      await ensureLibrarySession(wallet);
      const mig = await migratePlainKeys(wallet);
      setKeyStats(countKeyEncodings(listAllFiles(wallet.address)));
      setStatus({
        msg:
          mig.migrated > 0
            ? `Private vault unlocked · protected ${mig.migrated} legacy key${mig.migrated === 1 ? '' : 's'}`
            : 'Encryption active · file keys protected',
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

  const hasVisibleFolders = folderId === null && visibleFolders.length > 0;
  const hasContent = files.length > 0 || hasVisibleFolders;
  const hasLibraryItems = files.length > 0 || folders.length > 0;
  const shouldShowDropzone = folderId ? files.length > 0 : true;
  const backend = getLibraryBackend();
  const railFoot = [
    'Files encrypt on this device before upload. Blobs live on Shelby.',
    backend === 'neon'
      ? 'Library synced.'
      : backend === 'memory'
        ? 'Library sync is temporary.'
        : 'Library stays on this device.',
    vaultOk ? 'Encryption active.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex min-h-[100svh] min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--text)]">
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18.5rem] xl:items-start">
          <div className="min-w-0 space-y-5">
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

        {shouldShowDropzone ? (
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
        ) : null}

        {!folderId ? (
          <section className="space-y-3" aria-labelledby="drive-folders-title">
            <DriveSectionHeader
              id="drive-folders-title"
              title="Folders"
              description="Collections inside this private library. Search matches folder names too."
              count={visibleFolders.length}
            />
            <DriveFolderGrid
              folders={visibleFolders}
              countInFolder={(id) => countFilesInFolder(owner, id)}
              onOpen={setFolderId}
              onDelete={askDeleteFolder}
              onRename={askRenameFolder}
            />
          </section>
        ) : null}

        <section className="space-y-3" aria-labelledby="drive-files-title">
          <DriveSectionHeader
            id="drive-files-title"
            title="Files"
            description={
              folderId
                ? 'Files in this folder. Tap media to preview, then share from the card.'
                : 'All encrypted files in this library. Search is visible and local to your metadata.'
            }
            count={files.length}
          />
          <FilesToolbar
            query={filterQuery}
            onQueryChange={setFilterQuery}
            fileCount={files.length}
            selectedCount={selection.count}
            onSelectAll={() => selection.selectAll()}
            onClearSelection={() => selection.clear()}
          />
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
        </section>

        {hasLibraryItems &&
        !hasContent &&
        (filterQuery || filterKind !== 'all') ? (
          <DriveEmptyState
            scope="filtered"
            onUpload={() => inputRef.current?.click()}
            onClearFilters={() => {
              setFilterQuery('');
              setFilterKind('all');
            }}
          />
        ) : null}

        {!hasContent ? (
          <DriveEmptyState
            scope={folderId ? 'folder' : 'library'}
            onUpload={() => inputRef.current?.click()}
            onNewFolder={!folderId ? openNewFolder : undefined}
          />
        ) : folderId && files.length === 0 ? (
          <DriveEmptyState
            scope="folder"
            onUpload={() => inputRef.current?.click()}
          />
        ) : null}

        {status ? (
          <div className={`border-t border-[var(--border)] py-3 text-[0.8125rem] ${status.kind === 'ok' ? 'text-[#b8d4b8]' : status.kind === 'err' ? 'text-[#e8a0a0]' : 'text-[var(--text-2)]'}`} role="status">
            {status.msg}
          </div>
        ) : null}
          </div>

          <div className="hidden xl:block">
            <DriveDetailsPanel
              files={allFiles}
              selectedFiles={selectedFiles}
              totalBytes={totalBytes}
              folderCount={folders.length}
              vaultOk={vaultOk}
              backend={backend}
            />
          </div>
        </div>
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
          className={`${MODAL_BACKDROP_CLASS} ${
            dialogVisible ? MODAL_VISIBLE_BACKDROP_CLASS : MODAL_HIDDEN_BACKDROP_CLASS
          }`}
          role="presentation"
          onClick={() => {
            if (!dialogBusy) setDialog(null);
          }}
        >
          <div
            className={`${MODAL_CARD_CLASS} ${
              dialogVisible ? MODAL_VISIBLE_CARD_CLASS : MODAL_HIDDEN_CARD_CLASS
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {dialog.type === 'folder' ? (
              <>
                <h2 id="app-modal-title" className={MODAL_TITLE_CLASS}>
                  New folder
                </h2>
                <p className={MODAL_SUB_CLASS}>Name your album or collection</p>
                <label className={MODAL_LABEL_CLASS} htmlFor="folder-name-input">
                  Folder name
                </label>
                <input
                  id="folder-name-input"
                  ref={folderInputRef}
                  className={MODAL_INPUT_CLASS}
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
                <div className={MODAL_ACTIONS_CLASS}>
                  <button type="button" className={MODAL_BUTTON_GHOST_CLASS} disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className={MODAL_BUTTON_PRIMARY_CLASS} disabled={dialogBusy} onClick={() => void submitNewFolder()}>{dialogBusy ? 'Creating…' : 'Create'}</button>
                </div>
              </>
            ) : dialog.type === 'rename-file' || dialog.type === 'rename-folder' ? (
              <>
                <h2 id="app-modal-title" className={MODAL_TITLE_CLASS}>
                  {dialog.type === 'rename-file' ? 'Rename file' : 'Rename folder'}
                </h2>
                <label className={MODAL_LABEL_CLASS} htmlFor="rename-input">Name</label>
                <input
                  id="rename-input"
                  className={MODAL_INPUT_CLASS}
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
                <div className={MODAL_ACTIONS_CLASS}>
                  <button type="button" className={MODAL_BUTTON_GHOST_CLASS} disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className={MODAL_BUTTON_PRIMARY_CLASS} disabled={dialogBusy || !renameValue.trim()} onClick={() => void submitRename()}>{dialogBusy ? 'Saving…' : 'Save'}</button>
                </div>
              </>
            ) : dialog.type === 'move-file' ? (
              <>
                <h2 id="app-modal-title" className={MODAL_TITLE_CLASS}>Move file</h2>
                <p className={MODAL_SUB_CLASS}>
                  Move <strong className={MODAL_EM_CLASS}>{dialog.name}</strong> to…
                </p>
                <div className={MODAL_ACTIONS_STACK_CLASS}>
                  <button type="button" className={MODAL_BUTTON_GHOST_CLASS} disabled={dialogBusy} onClick={() => void submitMoveFile(null)}>All files (root)</button>
                  {folders.map((f) => (
                    <button key={f.id} type="button" className={MODAL_BUTTON_GHOST_CLASS} disabled={dialogBusy} onClick={() => void submitMoveFile(f.id)}>{f.name}</button>
                  ))}
                  <button type="button" className={MODAL_BUTTON_GHOST_CLASS} disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                </div>
              </>
            ) : dialog.type === 'delete-folder' ? (
              <>
                <h2 id="app-modal-title" className={MODAL_TITLE_CLASS}>Delete folder?</h2>
                <p className={MODAL_SUB_CLASS}>
                  <strong className={MODAL_EM_CLASS}>{dialog.name}</strong> will be removed.
                  {dialog.fileCount > 0 ? (
                    <> Its {dialog.fileCount} file{dialog.fileCount === 1 ? '' : 's'} move to <strong className={MODAL_EM_CLASS}>All files</strong>.</>
                  ) : (
                    <> It&apos;s empty.</>
                  )}
                </p>
                <div className={MODAL_ACTIONS_CLASS}>
                  <button type="button" className={MODAL_BUTTON_GHOST_CLASS} disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className={MODAL_BUTTON_DANGER_CLASS} disabled={dialogBusy} onClick={() => void confirmDelete()}>{dialogBusy ? 'Deleting…' : 'Delete folder'}</button>
                </div>
              </>
            ) : dialog.type === 'delete' ? (
              <>
                <h2 id="app-modal-title" className={MODAL_TITLE_CLASS}>Remove file?</h2>
                <p className={MODAL_SUB_CLASS}>
                  <strong className={MODAL_EM_CLASS}>{dialog.name}</strong> will leave your library index. The blob stays on Shelby until it expires.
                </p>
                <div className={MODAL_ACTIONS_CLASS}>
                  <button type="button" className={MODAL_BUTTON_GHOST_CLASS} disabled={dialogBusy} onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className={MODAL_BUTTON_DANGER_CLASS} disabled={dialogBusy} onClick={() => void confirmDelete()}>{dialogBusy ? 'Removing…' : 'Remove'}</button>
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
