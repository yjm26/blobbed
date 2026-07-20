import type { FileMetadata, FolderMetadata, LibrarySnapshot } from './types';
import type { WalletAccount } from './types';
import { createOwnerAuth, sha256Hex } from './owner-auth';

function keyFor(owner: string): string {
  return `blobbed_lib_v1_${owner.toLowerCase()}`;
}

function empty(): LibrarySnapshot {
  return { version: 1, folders: [], files: [] };
}

/** In-memory session cache (hydrated from API + localStorage). */
const cache = new Map<string, LibrarySnapshot>();

let lastBackend: 'neon' | 'memory' | 'local' | 'unknown' = 'unknown';

/** HMAC library session (memory only - not sessionStorage). */
let librarySession: { address: string; token: string; exp: number } | null = null;
let authWallet: WalletAccount | null = null;

export function getLibraryBackend(): typeof lastBackend {
  return lastBackend;
}

export function setLibraryAuthWallet(wallet: WalletAccount | null): void {
  authWallet = wallet;
  if (!wallet) librarySession = null;
  else if (
    librarySession &&
    librarySession.address !== wallet.address.trim().toLowerCase()
  ) {
    librarySession = null;
  }
}

export function clearLibrarySession(): void {
  librarySession = null;
  authWallet = null;
}

function cacheKey(owner: string): string {
  return owner.toLowerCase();
}

function readLocal(ownerAddress: string): LibrarySnapshot {
  try {
    const raw = localStorage.getItem(keyFor(ownerAddress));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as LibrarySnapshot;
    if (!parsed || parsed.version !== 1) return empty();
    return {
      version: 1,
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      files: Array.isArray(parsed.files) ? parsed.files : [],
    };
  } catch {
    return empty();
  }
}

function writeLocal(ownerAddress: string, lib: LibrarySnapshot): void {
  localStorage.setItem(keyFor(ownerAddress), JSON.stringify(lib));
  cache.set(cacheKey(ownerAddress), lib);
}

function getCached(ownerAddress: string): LibrarySnapshot {
  const k = cacheKey(ownerAddress);
  if (cache.has(k)) return cache.get(k)!;
  const local = readLocal(ownerAddress);
  cache.set(k, local);
  return local;
}

async function apiGet(ownerAddress: string): Promise<LibrarySnapshot | null> {
  try {
    const payload: Record<string, unknown> = {
      op: 'sync',
      ownerAddress,
    };
    if (librarySession?.token && librarySession.exp > Date.now()) {
      payload.sessionToken = librarySession.token;
    } else if (authWallet) {
      try {
        await ensureLibrarySession(authWallet);
        if (librarySession?.token) {
          payload.sessionToken = librarySession.token;
        }
      } catch {
        /* will 401 without token */
      }
    }

    const res = await fetch(`/api/library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      librarySession = null;
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data.backend === 'neon' || data.backend === 'memory') {
      lastBackend = data.backend;
    }
    return {
      version: 1,
      folders: Array.isArray(data.folders) ? data.folders : [],
      files: Array.isArray(data.files) ? data.files : [],
    };
  } catch {
    return null;
  }
}

/**
 * Ensure library session ticket (1 wallet sign / ~2h).
 * Call after vault unlock on drive boot.
 */
export async function ensureLibrarySession(
  wallet: WalletAccount
): Promise<string> {
  authWallet = wallet;
  const addr = wallet.address.trim().toLowerCase();
  if (
    librarySession &&
    librarySession.address === addr &&
    librarySession.exp > Date.now() + 60_000
  ) {
    return librarySession.token;
  }

  const payloadHash = await sha256Hex(`session|${addr}`);
  const auth = await createOwnerAuth(wallet, 'session', payloadHash);
  const res = await fetch('/api/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      op: 'session',
      ownerAddress: wallet.address,
      auth,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(
      (data as { error?: string }).error ||
        'Library session failed - sign rejected or server auth error'
    );
  }
  librarySession = {
    address: addr,
    token: String(data.token),
    exp: Number(data.exp) || Date.now() + 2 * 60 * 60 * 1000,
  };
  return librarySession.token;
}

async function apiPost(
  body: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  try {
    const payload = { ...body };
    if (librarySession?.token && librarySession.exp > Date.now()) {
      payload.sessionToken = librarySession.token;
    } else if (authWallet && body.op && body.op !== 'session') {
      // best-effort mint session
      try {
        await ensureLibrarySession(authWallet);
        if (librarySession?.token) payload.sessionToken = librarySession.token;
      } catch {
        /* local-only fallback */
      }
    }

    const res = await fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // session expired → clear so next call re-auths
      if (res.status === 401) librarySession = null;
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    if (data.backend === 'neon' || data.backend === 'memory') {
      lastBackend = data.backend as 'neon' | 'memory';
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Load library: prefer durable API, merge/migrate from localStorage if API empty.
 * Always keeps a local cache for offline-ish UX.
 */
export async function hydrateLibrary(ownerAddress: string): Promise<LibrarySnapshot> {
  const local = readLocal(ownerAddress);
  const remote = await apiGet(ownerAddress);

  if (!remote) {
    lastBackend = 'local';
    writeLocal(ownerAddress, local);
    return local;
  }

  const remoteEmpty = remote.folders.length === 0 && remote.files.length === 0;
  const localHasData = local.folders.length > 0 || local.files.length > 0;

  // One-shot migrate: local → durable when server empty
  if (remoteEmpty && localHasData) {
    const synced = await apiPost({
      op: 'sync',
      ownerAddress,
      folders: local.folders,
      files: local.files,
    });
    if (synced && Array.isArray(synced.folders)) {
      const lib: LibrarySnapshot = {
        version: 1,
        folders: synced.folders as FolderMetadata[],
        files: (synced.files as FileMetadata[]) || [],
      };
      writeLocal(ownerAddress, lib);
      return lib;
    }
  }

  const lib =
    !remoteEmpty
      ? remote
      : localHasData
        ? local
        : remote;

  writeLocal(ownerAddress, lib);
  return lib;
}

export function loadLibrary(ownerAddress: string): LibrarySnapshot {
  return getCached(ownerAddress);
}

export function saveLibrary(ownerAddress: string, lib: LibrarySnapshot): void {
  writeLocal(ownerAddress, lib);
}

export async function syncLibrary(ownerAddress: string, lib: LibrarySnapshot): Promise<LibrarySnapshot> {
  const remote = await apiPost({
    op: 'sync',
    ownerAddress,
    folders: lib.folders,
    files: lib.files,
  });
  if (remote && Array.isArray(remote.folders)) {
    const next: LibrarySnapshot = {
      version: 1,
      folders: remote.folders as FolderMetadata[],
      files: (remote.files as FileMetadata[]) || [],
    };
    writeLocal(ownerAddress, next);
    return next;
  }
  writeLocal(ownerAddress, lib);
  return lib;
}

export async function enableFolderShareRemote(
  ownerAddress: string,
  folderId: string
): Promise<{ id: string; folderId: string; status: 'active' | 'revoked' }> {
  const remote = await apiPost({
    op: 'enableFolderShare',
    ownerAddress,
    folderId,
  });
  const share = remote?.share as { id?: string; folderId?: string; status?: 'active' | 'revoked' } | undefined;
  if (!share?.id) throw new Error('Enable live share failed');
  return { id: share.id, folderId: share.folderId || folderId, status: share.status || 'active' };
}

export async function createFolder(
  ownerAddress: string,
  name: string
): Promise<FolderMetadata> {
  const folder: FolderMetadata = {
    id: crypto.randomUUID(),
    ownerAddress,
    name: name.trim() || 'Untitled folder',
    createdAt: new Date().toISOString(),
  };

  const remote = await apiPost({
    op: 'createFolder',
    ownerAddress,
    name: folder.name,
    id: folder.id,
  });

  const saved =
    remote && remote.folder
      ? (remote.folder as FolderMetadata)
      : folder;

  const lib = getCached(ownerAddress);
  lib.folders = [saved, ...lib.folders.filter((f) => f.id !== saved.id)];
  writeLocal(ownerAddress, lib);
  return saved;
}

export async function renameFolder(
  ownerAddress: string,
  folderId: string,
  name: string
): Promise<void> {
  const next = name.trim();
  if (!next) return;

  await apiPost({
    op: 'renameFolder',
    ownerAddress,
    folderId,
    name: next,
  });

  const lib = getCached(ownerAddress);
  const f = lib.folders.find((x) => x.id === folderId);
  if (f) {
    f.name = next;
    writeLocal(ownerAddress, lib);
  }
}

export async function deleteFolder(ownerAddress: string, folderId: string): Promise<void> {
  await apiPost({
    op: 'deleteFolder',
    ownerAddress,
    folderId,
  });

  const lib = getCached(ownerAddress);
  lib.folders = lib.folders.filter((f) => f.id !== folderId);
  for (const file of lib.files) {
    if (file.folderId === folderId) file.folderId = null;
  }
  writeLocal(ownerAddress, lib);
}

export async function addFile(
  ownerAddress: string,
  file: FileMetadata
): Promise<FileMetadata> {
  const remote = await apiPost({
    op: 'addFile',
    ownerAddress,
    file,
  });

  const saved =
    remote && remote.file ? (remote.file as FileMetadata) : file;

  const lib = getCached(ownerAddress);
  lib.files = [saved, ...lib.files.filter((f) => f.id !== saved.id)];
  writeLocal(ownerAddress, lib);
  return saved;
}

export async function removeFile(ownerAddress: string, fileId: string): Promise<void> {
  await apiPost({
    op: 'deleteFile',
    ownerAddress,
    fileId,
  });

  const lib = getCached(ownerAddress);
  lib.files = lib.files.filter((f) => f.id !== fileId);
  writeLocal(ownerAddress, lib);
}

export function listFolders(ownerAddress: string): FolderMetadata[] {
  return loadLibrary(ownerAddress).folders;
}

export function listFiles(
  ownerAddress: string,
  folderId: string | null
): FileMetadata[] {
  const lib = loadLibrary(ownerAddress);
  return lib.files.filter((f) => (f.folderId || null) === folderId);
}

export function getFolder(
  ownerAddress: string,
  folderId: string
): FolderMetadata | undefined {
  return loadLibrary(ownerAddress).folders.find((f) => f.id === folderId);
}

export function countFilesInFolder(ownerAddress: string, folderId: string): number {
  return listFiles(ownerAddress, folderId).length;
}

export function listAllFiles(ownerAddress: string): FileMetadata[] {
  return loadLibrary(ownerAddress).files;
}

export async function renameFile(ownerAddress: string, fileId: string, newName: string): Promise<void> {
  await apiPost({
    op: 'renameFile',
    ownerAddress,
    fileId,
    newName,
  });

  const lib = getCached(ownerAddress);
  const f = lib.files.find((x) => x.id === fileId);
  if (f) f.originalName = newName.trim();
  writeLocal(ownerAddress, lib);
}

/** Move file into folder (null = All files / root). */
export async function moveFile(
  ownerAddress: string,
  fileId: string,
  folderId: string | null,
  folderWrappedKey?: string | null
): Promise<void> {
  await apiPost({
    op: 'moveFile',
    ownerAddress,
    fileId,
    folderId,
    folderWrappedKey,
  });

  const lib = getCached(ownerAddress);
  const f = lib.files.find((x) => x.id === fileId);
  if (f) {
    f.folderId = folderId;
    f.folderWrappedKey = folderWrappedKey || undefined;
    writeLocal(ownerAddress, lib);
  }
}
