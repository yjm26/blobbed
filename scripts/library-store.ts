import type { FileMetadata, FolderMetadata, LibrarySnapshot } from './types';

function keyFor(owner: string): string {
  return `blobbed_lib_v1_${owner.toLowerCase()}`;
}

function empty(): LibrarySnapshot {
  return { version: 1, folders: [], files: [] };
}

export function loadLibrary(ownerAddress: string): LibrarySnapshot {
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

export function saveLibrary(ownerAddress: string, lib: LibrarySnapshot): void {
  localStorage.setItem(keyFor(ownerAddress), JSON.stringify(lib));
}

export function createFolder(ownerAddress: string, name: string): FolderMetadata {
  const lib = loadLibrary(ownerAddress);
  const folder: FolderMetadata = {
    id: crypto.randomUUID(),
    ownerAddress,
    name: name.trim() || 'Untitled folder',
    createdAt: new Date().toISOString(),
  };
  lib.folders.unshift(folder);
  saveLibrary(ownerAddress, lib);
  return folder;
}

export function renameFolder(ownerAddress: string, folderId: string, name: string): void {
  const lib = loadLibrary(ownerAddress);
  const f = lib.folders.find((x) => x.id === folderId);
  if (f) {
    f.name = name.trim() || f.name;
    saveLibrary(ownerAddress, lib);
  }
}

export function deleteFolder(ownerAddress: string, folderId: string): void {
  const lib = loadLibrary(ownerAddress);
  lib.folders = lib.folders.filter((f) => f.id !== folderId);
  // files become root
  for (const file of lib.files) {
    if (file.folderId === folderId) file.folderId = null;
  }
  saveLibrary(ownerAddress, lib);
}

export function addFile(ownerAddress: string, file: FileMetadata): FileMetadata {
  const lib = loadLibrary(ownerAddress);
  lib.files.unshift(file);
  saveLibrary(ownerAddress, lib);
  return file;
}

export function removeFile(ownerAddress: string, fileId: string): void {
  const lib = loadLibrary(ownerAddress);
  lib.files = lib.files.filter((f) => f.id !== fileId);
  saveLibrary(ownerAddress, lib);
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
