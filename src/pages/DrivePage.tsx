import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  disconnectWallet,
  getConnectedWallet,
  hasAppSession,
} from '../../scripts/aptos-client';
import { uploadFiles } from '../../scripts/upload';
import {
  createFolder,
  listFiles,
  listFolders,
  listAllFiles,
  removeFile,
  getFolder,
  countFilesInFolder,
  hydrateLibrary,
  getLibraryBackend,
} from '../../scripts/library-store';
import {
  generateFileShareLink,
  generateFolderShareLink,
  fileToShareItem,
} from '../../scripts/share';
import {
  previewObjectUrl,
  isImageMime,
  isVideoMime,
} from '../../scripts/preview';
import type { FileMetadata, FolderMetadata } from '../../scripts/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

type DialogState =
  | null
  | { type: 'folder' }
  | { type: 'delete'; fileId: string; name: string };

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
      setStatus({ msg: 'Syncing library…', kind: 'info' });
      await hydrateLibrary(w.address);
      if (cancelled) return;
      const backend = getLibraryBackend();
      if (backend === 'neon') {
        setStatus({ msg: 'Library synced (Neon)', kind: 'ok' });
        setTimeout(() => setStatus(null), 2200);
      } else if (backend === 'memory') {
        setStatus({
          msg: 'Library on server memory — set DATABASE_URL for durable DB',
          kind: 'info',
        });
      } else {
        setStatus({
          msg: 'Library local-only — set DATABASE_URL on Vercel',
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
    return owner ? listFiles(owner, folderId) : [];
  }, [owner, folderId, tick]);

  const currentFolder = folderId && owner ? getFolder(owner, folderId) : undefined;

  useEffect(() => {
    if (!owner) return;
    for (const f of files) {
      if (!isImageMime(f.mimeType, f.originalName)) continue;
      if (thumbs.current.has(f.id)) continue;
      void previewObjectUrl(fileToShareItem(f))
        .then((url) => {
          thumbs.current.set(f.id, url);
          setThumbTick((t) => t + 1);
        })
        .catch(() => {});
    }
  }, [files, owner, tick]);

  async function handleFiles(list: FileList | File[]) {
    if (!wallet) return;
    const arr = Array.from(list);
    if (!arr.length) return;
    try {
      await uploadFiles(arr, wallet, folderId, (name, i, total) => {
        setStatus({ msg: `Uploading ${i + 1}/${total}: ${name}`, kind: 'info' });
      });
      setStatus({
        msg: `Uploaded ${arr.length} file${arr.length === 1 ? '' : 's'}`,
        kind: 'ok',
      });
    } catch (err: unknown) {
      setStatus({
        msg: 'Upload failed: ' + (err instanceof Error ? err.message : String(err)),
        kind: 'err',
      });
    }
    refresh();
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
    if (!owner || !folderId) return;
    const folder = getFolder(owner, folderId);
    if (!folder) return;
    const fl = listFiles(owner, folderId);
    if (!fl.length) {
      setStatus({ msg: 'Folder is empty — upload something first', kind: 'err' });
      return;
    }
    try {
      const link = generateFolderShareLink(folder, fl);
      await navigator.clipboard.writeText(link);
      setStatus({ msg: 'Folder share link copied', kind: 'ok' });
    } catch (err: unknown) {
      setStatus({
        msg: err instanceof Error ? err.message : 'Share failed',
        kind: 'err',
      });
    }
  }

  async function onShareFile(id: string) {
    const file = listAllFiles(owner).find((f) => f.id === id);
    if (!file) return;
    try {
      const link = generateFileShareLink(file);
      await navigator.clipboard.writeText(link);
      setStatus({ msg: 'Share link copied', kind: 'ok' });
    } catch {
      setStatus({ msg: 'Share failed', kind: 'err' });
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

  async function confirmDelete() {
    if (!dialog || dialog.type !== 'delete' || dialogBusy) return;
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
  }

  async function onPreview(id: string) {
    const file = listAllFiles(owner).find((f) => f.id === id);
    if (!file) return;
    try {
      setStatus({ msg: 'Loading preview…', kind: 'info' });
      const url = await previewObjectUrl(fileToShareItem(file));
      thumbs.current.set(file.id, url);
      const w = window.open('', '_blank');
      if (w) {
        const safe = file.originalName.replace(/[<>&"]/g, '');
        if (isImageMime(file.mimeType, file.originalName)) {
          w.document.write(
            `<title>${safe}</title><body style="margin:0;background:#0a0a0a;display:flex;min-height:100vh;align-items:center;justify-content:center"><img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body>`
          );
        } else {
          w.document.write(
            `<title>${safe}</title><body style="margin:0;background:#0a0a0a;display:flex;min-height:100vh;align-items:center;justify-content:center"><video src="${url}" controls autoplay style="max-width:100%;max-height:100vh"></video></body>`
          );
        }
      }
      setStatus(null);
    } catch (err) {
      setStatus({
        msg: 'Preview failed: ' + (err instanceof Error ? err.message : String(err)),
        kind: 'err',
      });
    }
  }

  async function onDisconnect() {
    setWallet(null);
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
      <div className="app-page" style={{ display: 'grid', placeItems: 'center' }}>
        <p className="app-stage-sub">Loading…</p>
      </div>
    );
  }

  const chip = wallet.address.slice(0, 6) + '…' + wallet.address.slice(-4);
  const hasContent = files.length > 0 || (folderId === null && folders.length > 0);

  return (
    <div className="app-page">
      <header className="app-top">
        <Link to="/" className="app-brand">
          BLOBBED
        </Link>
        <div className="app-top-right">
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
        <aside className="app-rail">
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
            Library meta on Neon when configured.
            <br />
            Blobs on Shelby. Share keys stay in the link fragment.
          </p>
        </aside>

        <section className="app-stage">
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
              {folderId ? (
                <button
                  type="button"
                  className="app-btn-ghost"
                  onClick={() => void onShareFolder()}
                >
                  Share folder
                </button>
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
                <button
                  key={f.id}
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
              ))}
            </div>
          ) : null}

          {files.length > 0 ? (
            <div className="app-file-list">
              {files.map((f) => {
                const canPreview =
                  isImageMime(f.mimeType, f.originalName) ||
                  isVideoMime(f.mimeType, f.originalName);
                const thumb = thumbs.current.get(f.id);
                return (
                  <article key={f.id} className="app-file-row">
                    <div className="app-file-thumb">
                      {thumb ? (
                        <img src={thumb} alt="" />
                      ) : (
                        <span className="app-file-thumb-ph">{canPreview ? '…' : 'FILE'}</span>
                      )}
                    </div>
                    <div className="app-file-meta">
                      <h3 className="app-file-name">{f.originalName}</h3>
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
                          Preview
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

          {!hasContent ? (
            <div className="app-empty">
              <p className="app-empty-title">Nothing here yet</p>
              <p className="app-empty-hint">
                Create a folder for an album, or upload files.
              </p>
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

      {/* In-app modal — no browser prompt/confirm */}
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
            ) : (
              <>
                <h2 id="app-modal-title" className="app-modal-title">
                  Remove file?
                </h2>
                <p className="app-modal-sub">
                  <strong className="app-modal-em">{dialog.name}</strong> will leave your
                  library index. The blob stays on Shelby until it expires.
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
    </div>
  );
}
