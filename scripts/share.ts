import type {
  FileMetadata,
  FolderMetadata,
  FolderSharePayload,
  FileSharePayload,
  SharePayload,
  ShareFileItem,
} from './types';

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

export function fileToShareItem(f: FileMetadata): ShareFileItem {
  return {
    a: f.storageAccount,
    n: f.blobName || f.shelbyHash,
    k: f.encryptedKey,
    name: f.originalName,
    mime: f.mimeType || 'application/octet-stream',
    size: f.sizeBytes || 0,
  };
}

export function buildFolderSharePayload(
  folder: FolderMetadata,
  files: FileMetadata[]
): FolderSharePayload {
  return {
    v: 1,
    type: 'folder',
    name: folder.name,
    files: files.map(fileToShareItem),
  };
}

export function buildFileSharePayload(f: FileMetadata): FileSharePayload {
  return {
    v: 1,
    type: 'file',
    ...fileToShareItem(f),
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

export function generateFolderShareLink(
  folder: FolderMetadata,
  files: FileMetadata[]
): string {
  const payload = buildFolderSharePayload(folder, files);
  const frag = encodeSharePayload(payload);
  if (frag.length > 12000) {
    throw new Error(
      'Folder too large to share via link. Remove some files or split the folder.'
    );
  }
  return `${window.location.origin}/pages/view.html#${frag}`;
}

export function generateFileShareLink(file: FileMetadata): string {
  const payload = buildFileSharePayload(file);
  const frag = encodeSharePayload(payload);
  return `${window.location.origin}/pages/view.html#${frag}`;
}

/** Keep old download.html links working */
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
  return `${window.location.origin}/pages/view.html#${encodeSharePayload(payload)}`;
}
