import { generateKey, keyToBase64, base64ToKey } from './crypto';
import {
  chooseEncFormat,
  encryptForUpload,
  decryptContainer,
  type ProgressFn,
} from './chunked-crypto';
import { downloadFromShelby } from './shelby-client';
import type { ShareFileItem } from './types';

export type { ProgressFn };

async function readStream(
  stream: ReadableStream<Uint8Array>,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  // unknown total — pulse ratio gently
  let ticks = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    ticks++;
    onProgress?.({
      phase: 'download',
      ratio: Math.min(0.92, 0.08 + ticks * 0.04),
      detail: `Downloaded ${(total / 1024).toFixed(0)} KB`,
    });
  }
  onProgress?.({
    phase: 'download',
    ratio: 1,
    detail: `Downloaded ${(total / 1024).toFixed(0)} KB`,
  });
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export async function decryptShareItem(
  item: ShareFileItem,
  onProgress?: ProgressFn
): Promise<Uint8Array> {
  if (!item.a) {
    throw new Error('Missing storage account on share item');
  }
  const key = base64ToKey(item.k);
  onProgress?.({ phase: 'download', ratio: 0.02, detail: 'Fetching blob…' });
  const stream = await downloadFromShelby(item.a, item.n);
  const encryptedData = await readStream(stream, onProgress);
  onProgress?.({ phase: 'decrypt', ratio: 0, detail: 'Decrypting…' });
  const plain = await decryptContainer(encryptedData, key, { onProgress });
  onProgress?.({ phase: 'done', ratio: 1, detail: 'Ready' });
  return plain;
}

export function isImageMime(mime: string, name = ''): boolean {
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(name);
}

export function isVideoMime(mime: string, name = ''): boolean {
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(name);
}

function guessMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return 'application/octet-stream';
}

/** Decrypt image/video and return object URL — caller must revoke */
export async function previewObjectUrl(
  item: ShareFileItem,
  onProgress?: ProgressFn
): Promise<string> {
  const plain = await decryptShareItem(item, onProgress);
  const ab = new ArrayBuffer(plain.byteLength);
  new Uint8Array(ab).set(plain);
  const mime =
    item.mime && item.mime !== 'application/octet-stream'
      ? item.mime
      : guessMime(item.name);
  const blob = new Blob([ab], { type: mime });
  return URL.createObjectURL(blob);
}

export async function downloadShareItem(
  item: ShareFileItem,
  onProgress?: ProgressFn
): Promise<void> {
  const plain = await decryptShareItem(item, onProgress);
  const ab = new ArrayBuffer(plain.byteLength);
  new Uint8Array(ab).set(plain);
  const mime = item.mime || guessMime(item.name);
  const blob = new Blob([ab], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.name || 'file';
  a.click();
  URL.revokeObjectURL(url);
}

// re-export helpers used by upload
export { generateKey, keyToBase64, chooseEncFormat, encryptForUpload };
