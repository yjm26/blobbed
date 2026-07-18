import { downloadFromShelby } from './shelby-client';
import { decryptFile, base64ToKey } from './crypto';
import { parseShareFragment } from './share';
import '../src/style.css';

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

async function init() {
  const btn = document.getElementById('download-btn') as HTMLButtonElement | null;
  const info = document.getElementById('file-info');
  const nameEl = document.getElementById('file-name');

  const payload = parseShareFragment(window.location.hash);
  if (!payload || !payload.key || !payload.blobName) {
    if (btn) btn.textContent = 'Invalid link';
    return;
  }

  if (!payload.storageAccount) {
    if (btn) btn.textContent = 'Legacy link (missing storage account)';
    // still allow attempt if env injects default — otherwise click fails clearly
  }

  info?.classList.remove('hidden');
  if (nameEl) {
    // show blob path tail
    const tail = payload.blobName.split('/').pop() || payload.blobName;
    nameEl.textContent = tail;
  }

  btn?.addEventListener('click', async () => {
    try {
      await downloadAndDecrypt(payload.storageAccount, payload.blobName, payload.key);
    } catch (err: any) {
      alert('Download failed: ' + (err?.message || err));
    }
  });
}

async function downloadAndDecrypt(
  storageAccount: string,
  blobName: string,
  keyBase64: string
): Promise<void> {
  if (!storageAccount) {
    throw new Error('Share link missing storage account. Re-upload and share a new link.');
  }

  const progress = document.getElementById('progress');
  const bar = document.getElementById('progress-bar') as HTMLElement | null;
  const progressText = document.getElementById('progress-text');
  progress?.classList.remove('hidden');
  if (progressText) progressText.textContent = 'Downloading from Shelby…';
  if (bar) bar.style.width = '20%';

  const key = base64ToKey(keyBase64);
  const stream = await downloadFromShelby(storageAccount, blobName);
  if (bar) bar.style.width = '55%';
  if (progressText) progressText.textContent = 'Decrypting…';

  const encryptedData = await readStream(stream);
  // IV = first 12 bytes (AES-GCM)
  const iv = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);
  const decrypted = await decryptFile({ ciphertext, iv }, key);

  if (bar) bar.style.width = '90%';

  const nameGuess = blobName.split('/').pop()?.replace(/^[a-z0-9]+_[a-z0-9]+_/i, '') || 'file';
  const ab = new ArrayBuffer(decrypted.byteLength);
  new Uint8Array(ab).set(decrypted);
  const blob = new Blob([ab]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nameGuess;
  a.click();
  URL.revokeObjectURL(url);

  if (bar) bar.style.width = '100%';
  if (progressText) progressText.textContent = 'Done';
}

init().catch(console.error);
