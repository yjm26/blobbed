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

import { DriveLayout } from '../components';
import { DriveHeader, DriveToolbar, DriveContent } from '../components/feature/drive';
import BrandLoader from '../components/shared/BrandLoader';
import MediaLightbox, { type MediaLightboxState } from '../components/feature/media/MediaLightbox';
import ShareSheet, { type ShareSheetState } from '../components/feature/share/ShareSheet';
import UploadQueuePanel, { type QueueJob } from '../components/feature/upload/UploadQueuePanel';
import FilterMenu, { type FileKindFilter, type SortKey } from '../components/shared/FilterMenu';

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

  const [wallet, setWallet] = useState<{ address: string; publicKey: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<{ msg: string; kind: 'info' | 'err' | 'ok' } | null>(null);
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
      return (s as SortKey) || 'date';
    } catch {
      return 'date';
    }
  });
  const [filterKind, setFilterKind] = useState<FileKindFilter>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Data state
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [folders, setFolders] = useState<FolderMetadata[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderMetadata | null>(null);
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [queueCollapsed, setQueueCollapsed] = useState(false);

  const owner = wallet?.address || '';

  const openNewFolder = useCallback(() => {
    setDialog({ type: 'folder' });
  }, []);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  // Load data
  useEffect(() => {
    if (!wallet) return;

    const loadData = async () => {
      const allFolders = listFolders(owner);
      setFolders(allFolders);

      if (folderId) {
        const f = getFolder(owner, folderId);
        setCurrentFolder(f);
        const folderFiles = listFiles(owner, folderId);
        setFiles(folderFiles);
      } else {
        setCurrentFolder(null);
        const rootFiles = listFiles(owner, null);
        setFiles(rootFiles);
      }
    };

    loadData();
  }, [wallet, folderId, tick, owner]);

  // === HANDLERS ===

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (!wallet) return;
    const arr = Array.from(fileList);
    for (const file of arr) {
      try {
        await uploadFile(file, folderId || undefined);
      } catch (e) {
        console.error(e);
      }
    }
    refresh();
  }, [wallet, folderId, refresh]);

  const onDisconnect = async () => {
    await disconnectWallet();
    nav('/gate', { replace: true });
  };

  const onUnlockVault = async () => {
    if (!wallet) return;
    try {
      await ensureVaultUnlocked(wallet);
      setVaultOk(true);
    } catch (e) {
      setVaultOk(false);
    }
  };

  const setView = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    try { localStorage.setItem('blobbed_view', mode); } catch {}
  };

  const setSort = (s: SortKey) => {
    setSortBy(s);
    try { localStorage.setItem('blobbed_sort', s); } catch {}
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!wallet || !folderName.trim()) return;
    setDialogBusy(true);
    try {
      await createFolder(owner, folderName.trim());
      setDialog(null);
      setFolderName('Album');
      refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDialogBusy(false);
    }
  };

  // Delete handlers
  const askDeleteFile = (fileId: string, name: string) => {
    setDialog({ type: 'delete', fileId, name });
  };

  const askDeleteFolder = (fid: string, name: string) => {
    const count = countFilesInFolder(owner, fid);
    setDialog({ type: 'delete-folder', folderId: fid, name, fileCount: count });
  };

  if (!ready || !wallet) {
    return <BrandLoader label="Syncing your library" />;
  }

  return (
    <DriveLayout
      folderName={folderId ? currentFolder?.name : undefined}
      onNewFolder={openNewFolder}
      onUpload={() => inputRef.current?.click()}
      onRefresh={() => setTick(t => t + 1)}
      onSearch={setFilterQuery}
      isLoading={false}
    >
      <DriveHeader
        folderName={folderId ? currentFolder?.name : undefined}
        onNewFolder={openNewFolder}
        onUpload={() => inputRef.current?.click()}
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
        fileCount={files.length}
        folderCount={folders.length}
      />
      <DriveToolbar
        onRefresh={() => setTick(t => t + 1)}
        onSearch={setFilterQuery}
      />
      <DriveContent>
        <div
          className={`app-drop ${files.length > 0 ? 'app-drop-compact' : ''} ${drag ? 'is-drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
          }}
        >
          <span className="app-drop-title">Drop files here</span>
          <span className="app-drop-hint">
            {folderId ? 'Upload into this folder' : 'or click to browse'}
          </span>
        </div>

        {!folderId && folders.length > 0 && (
          <div className="drive-folder-grid">
            {folders.map((folder) => (
              <button key={folder.id} className="drive-folder-card" onClick={() => setFolderId(folder.id)}>
                <div className="drive-folder-icon">📁</div>
                <div className="drive-folder-name">{folder.name}</div>
                <div className="drive-folder-count">{countFilesInFolder(owner, folder.id)} files</div>
              </button>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className={viewMode === 'grid' ? 'drive-file-grid' : 'drive-file-list'}>
            {files.map((file) => (
              <div key={file.id} className="drive-file-item">
                <div className="drive-file-icon">
                  {isImageMime(file.mime) ? '🖼️' : isVideoMime(file.mime) ? '🎥' : '📄'}
                </div>
                <div className="drive-file-info">
                  <div className="drive-file-name">{file.name}</div>
                  <div className="drive-file-meta">
                    {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="drive-file-actions">
                  <button>Open</button>
                  <button>Share</button>
                  <button onClick={() => askDeleteFile(file.id, file.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {files.length === 0 && folders.length === 0 && (
          <div className="text-white/50 text-center py-12">No files yet. Upload something!</div>
        )}
      </DriveContent>

      {/* Dialog New Folder */}
      {dialog?.type === 'folder' && (
        <div className="modal">
          <div className="modal-content">
            <h3>New Folder</h3>
            <input
              ref={folderInputRef}
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="input"
              placeholder="Folder name"
            />
            <div className="modal-actions">
              <button onClick={() => setDialog(null)}>Cancel</button>
              <button onClick={handleCreateFolder} disabled={dialogBusy}>
                {dialogBusy ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DriveLayout>
  );
}
