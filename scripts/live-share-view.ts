import type { LiveFolderSharePayload, ShareFileItem } from './types';
import { rawKeyToBase64, unwrapFolderFileKey } from './key-wrap';

export async function fetchLiveFolderShare(
  shareId: string
): Promise<LiveFolderSharePayload> {
  const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 410) throw new Error('This live folder link was revoked or the folder was deleted.');
  if (res.status === 404) throw new Error('Live folder link not found.');
  if (!res.ok) throw new Error(String(body.error || 'Could not load live folder'));
  if (!body || body.v !== 1 || body.type !== 'folder-live' || !Array.isArray(body.files)) {
    throw new Error('Invalid live folder response');
  }
  return body as LiveFolderSharePayload;
}

export async function liveFolderItemsToShareItems(
  live: LiveFolderSharePayload,
  folderKey: Uint8Array
): Promise<ShareFileItem[]> {
  const out: ShareFileItem[] = [];
  for (const item of live.files) {
    if (!item.fk?.startsWith('fk1.')) continue;
    const raw = await unwrapFolderFileKey(item.fk, folderKey);
    out.push({
      a: item.a,
      n: item.n,
      k: rawKeyToBase64(raw),
      name: item.name,
      mime: item.mime || 'application/octet-stream',
      size: item.size || 0,
    });
  }
  return out;
}
