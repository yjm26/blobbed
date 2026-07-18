import { downloadFromShelby } from './shelby-client';
import { decryptFile, base64ToKey } from './crypto';
import type { ShareFileItem } from './types';

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export async function decryptShareItem(item: ShareFileItem): Promise<Uint8Array> {
  if (!item.a) {
    throw new Error('Missing storage account on share item');
  }
  const key = base64ToKey(item.k);
  const stream = await downloadFromShelby(item.a, item.n);
  const encryptedData = await readStream(stream);
  const iv = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);
  return decryptFile({ ciphertext, iv }, key);
}

export function isImageMime(mime: string, name = ''): boolean {
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(name);
}

export function isVideoMime(mime: string, name = ''): boolean {
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(name);
}

/** Decrypt image/video and return object URL — caller must revoke */
export async function previewObjectUrl(item: ShareFileItem): Promise<string> {
  const plain = await decryptShareItem(item);
  const ab = new ArrayBuffer(plain.byteLength);
  new Uint8Array(ab).set(plain);
  const mime = item.mime && item.mime !== 'application/octet-stream'
    ? item.mime
    : guessMime(item.name);
  const blob = new Blob([ab], { type: mime });
  return URL.createObjectURL(blob);
}

function guessMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
}

export async function downloadShareItem(item: ShareFileItem): Promise<void> {
  const plain = await decryptShareItem(item);
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
