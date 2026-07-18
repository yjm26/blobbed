export interface FileMetadata {
  id: string;
  ownerAddress: string;
  blobName: string;
  shelbyHash: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  encryptedKey: string;
  createdAt: string;
  expiresAt?: string;
}

export interface ShareLink {
  token: string;
  fileId: string;
  createdAt: string;
  expiresAt?: string;
  downloadCount: number;
}

export interface UploadProgress {
  phase: 'encrypting' | 'uploading' | 'finalizing';
  percent: number;
  bytesUploaded: number;
  totalBytes: number;
}

export interface DownloadState {
  blobHash: string;
  decryptionKey: string;
  fileName: string;
  mimeType: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface WalletAccount {
  address: string;
  publicKey: string;
}
