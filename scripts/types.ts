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
}

export interface FolderMetadata {
  id: string;
  ownerAddress: string;
  name: string;
  createdAt: string;
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

export interface UploadResult {
  storageAccount: string;
  blobName: string;
  blobHash: string;
  key: string;
  fileId?: string;
}
