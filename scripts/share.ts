import type {
  FileMetadata,
  FolderMetadata,
  FolderSharePayload,
  FileSharePayload,
  SharePayload,
  ShareFileItem,
  WalletAccount,
} from './types';
import { resolveRawKeyBase64 } from './vault';
import { isWrappedKey } from './key-wrap';

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8ToBase64Url(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

function base64UrlToUtf8(s: string): string {
  return new TextDecoder().decode(base64UrlToBytes(s));
}

/**
 * Sync helper - only safe when encryptedKey is already a raw DEK (legacy plain
 * or pre-resolved). Prefer fileToShareItemAsync for owner library files.
 */
export function fileToShareItem(f: FileMetadata): ShareFileItem {
  if (isWrappedKey(f.encryptedKey || '')) {
    throw new Error(
      'File key is wallet-wrapped - use fileToShareItemAsync after vault unlock'
    );
  }
  return {
    a: f.storageAccount,
    n: f.blobName || f.shelbyHash,
    k: f.encryptedKey,
    name: f.originalName,
    mime: f.mimeType || 'application/octet-stream',
    size: f.sizeBytes || 0,
  };
}

/** Resolve vault-wrapped DEK → raw key for share fragment / decrypt */
export async function fileToShareItemAsync(
  f: FileMetadata,
  wallet?: WalletAccount | null
): Promise<ShareFileItem> {
  const k = await resolveRawKeyBase64(f.encryptedKey || '', wallet);
  return {
    a: f.storageAccount,
    n: f.blobName || f.shelbyHash,
    k,
    name: f.originalName,
    mime: f.mimeType || 'application/octet-stream',
    size: f.sizeBytes || 0,
  };
}

export async function buildFolderSharePayload(
  folder: FolderMetadata,
  files: FileMetadata[],
  wallet?: WalletAccount | null
): Promise<FolderSharePayload> {
  const items: ShareFileItem[] = [];
  for (const f of files) {
    items.push(await fileToShareItemAsync(f, wallet));
  }
  return {
    v: 1,
    type: 'folder',
    name: folder.name,
    files: items,
  };
}

export async function buildFileSharePayload(
  f: FileMetadata,
  wallet?: WalletAccount | null
): Promise<FileSharePayload> {
  const item = await fileToShareItemAsync(f, wallet);
  return {
    v: 1,
    type: 'file',
    ...item,
  };
}

/** Encode share payload into URL fragment (keys never hit server logs as query) */
export function encodeSharePayload(payload: SharePayload): string {
  return utf8ToBase64Url(JSON.stringify(payload));
}

export function parseShareFragment(hash: string): SharePayload | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;

  // New compact base64url JSON
  try {
    if (!raw.includes('|') && !raw.includes(':')) {
      const json = base64UrlToUtf8(raw);
      const data = JSON.parse(json) as SharePayload;
      if (data && data.v === 1 && (data.type === 'folder' || data.type === 'file')) {
        return data;
      }
    }
  } catch {
    /* fall through */
  }

  // v2 single-file: account|blobName|key
  if (raw.includes('|')) {
    const parts = raw.split('|');
    if (parts.length >= 3) {
      try {
        const a = decodeURIComponent(parts[0]);
        const n = decodeURIComponent(parts[1]);
        const k = decodeURIComponent(parts.slice(2).join('|'));
        return {
          v: 1,
          type: 'file',
          a,
          n,
          k,
          name: n.split('/').pop() || 'file',
          mime: 'application/octet-stream',
          size: 0,
        };
      } catch {
        return null;
      }
    }
  }

  // v1 legacy hash:key
  if (raw.includes(':')) {
    const idx = raw.indexOf(':');
    const n = decodeURIComponent(raw.slice(0, idx));
    const k = decodeURIComponent(raw.slice(idx + 1));
    return {
      v: 1,
      type: 'file',
      a: '',
      n,
      k,
      name: n.split('/').pop() || 'file',
      mime: 'application/octet-stream',
      size: 0,
    };
  }

  return null;
}

export async function generateFolderShareLink(
  folder: FolderMetadata,
  files: FileMetadata[],
  wallet?: WalletAccount | null
): Promise<string> {
  const payload = await buildFolderSharePayload(folder, files, wallet);
  const frag = encodeSharePayload(payload);
  if (frag.length > 12000) {
    throw new Error(
      'Folder too large to share via link. Remove some files or split the folder.'
    );
  }
  return `${window.location.origin}/view#${frag}`;
}

export async function generateFileShareLink(
  file: FileMetadata,
  wallet?: WalletAccount | null
): Promise<string> {
  const payload = await buildFileSharePayload(file, wallet);
  const frag = encodeSharePayload(payload);
  return `${window.location.origin}/view#${frag}`;
}

/** Keep old download links working → SPA /view */
export function generateShareLink(
  storageAccount: string,
  blobName: string,
  key: string
): string {
  const payload: FileSharePayload = {
    v: 1,
    type: 'file',
    a: storageAccount,
    n: blobName,
    k: key,
    name: blobName.split('/').pop() || 'file',
    mime: 'application/octet-stream',
    size: 0,
  };
  return `${window.location.origin}/view#${encodeSharePayload(payload)}`;
}
