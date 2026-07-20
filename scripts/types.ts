export interface WalletAccount {
  address: string;
  publicKey: string;
}

export interface FileMetadata {
  id: string;
  ownerAddress: string;
  storageAccount: string;
  blobName: string;
  /** alias of blobName */
  shelbyHash: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  encryptedKey: string;
  createdAt: string;
  /** null/undefined = root */
  folderId?: string | null;
  expiresAt?: string;
  /** Phase B: encryption container */
  encFormat?: 'legacy' | 'chunked';
  /** Phase C: small JPEG data URL for grid */
  thumbDataUrl?: string;
  /** Live folder share: DEK wrapped with folder FK (`fk1.…`) */
  folderWrappedKey?: string;
}

export interface FolderMetadata {
  id: string;
  ownerAddress: string;
  name: string;
  createdAt: string;
  /** Live folder share: FK wrapped with owner vault (`bw1.…`) */
  folderKeyWrapped?: string;
}

export interface LibrarySnapshot {
  version: 1;
  folders: FolderMetadata[];
  files: FileMetadata[];
}

/** One file inside a shared folder package (keys live only in URL fragment) */
export interface ShareFileItem {
  a: string; // storageAccount
  n: string; // blobName
  k: string; // key base64
  name: string;
  mime: string;
  size: number;
}

export interface FolderSharePayload {
  v: 1;
  type: 'folder';
  name: string;
  files: ShareFileItem[];
}

export interface FileSharePayload {
  v: 1;
  type: 'file';
  a: string;
  n: string;
  k: string;
  name: string;
  mime: string;
  size: number;
}

export type SharePayload = FolderSharePayload | FileSharePayload;

export interface LiveFolderShareItem {
  id: string;
  name: string;
  mime: string;
  size: number;
  a: string;
  n: string;
  fk: string;
  encFormat?: 'legacy' | 'chunked';
}

export interface LiveFolderSharePayload {
  v: 1;
  type: 'folder-live';
  shareId: string;
  name: string;
  updatedAt: string;
  files: LiveFolderShareItem[];
}

export interface UploadResult {
  storageAccount: string;
  blobName: string;
  blobHash: string;
  key: string;
  fileId?: string;
}
