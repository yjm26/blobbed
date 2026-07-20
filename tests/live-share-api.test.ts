import { describe, it, expect } from 'vitest';
import {
  createFolder,
  insertFile,
  enableFolderShare,
  getPublicFolderShare,
  revokeFolderShare,
  moveFile,
} from '../api/lib/db';

function owner(tag: string) {
  return `0x${tag}${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`.toLowerCase();
}

describe('live folder share metadata', () => {
  it('serves only current folder files with folder-wrapped keys and revokes to 410 state', async () => {
    delete process.env.DATABASE_URL;
    const address = owner('aa');
    const folder = await createFolder(address, 'Album');
    const share = await enableFolderShare(address, folder.id);

    await insertFile({
      id: crypto.randomUUID(),
      ownerAddress: address,
      storageAccount: '0xstorage',
      blobName: 'blobbed/a.jpg',
      shelbyHash: 'blobbed/a.jpg',
      originalName: 'a.jpg',
      sizeBytes: 100,
      mimeType: 'image/jpeg',
      encryptedKey: 'bw1.owner',
      folderWrappedKey: 'fk1.a',
      createdAt: new Date().toISOString(),
      folderId: folder.id,
      encFormat: 'legacy',
    });
    await insertFile({
      id: crypto.randomUUID(),
      ownerAddress: address,
      storageAccount: '0xstorage',
      blobName: 'blobbed/root.jpg',
      shelbyHash: 'blobbed/root.jpg',
      originalName: 'root.jpg',
      sizeBytes: 100,
      mimeType: 'image/jpeg',
      encryptedKey: 'bw1.owner',
      folderWrappedKey: 'fk1.root',
      createdAt: new Date().toISOString(),
      folderId: null,
      encFormat: 'legacy',
    });

    const live = await getPublicFolderShare(share.id);
    expect(live.status).toBe('active');
    if (live.status !== 'active') throw new Error('expected active share');
    expect(live.share.name).toBe('Album');
    expect(live.share.files).toHaveLength(1);
    expect(live.share.files[0]).toMatchObject({ name: 'a.jpg', fk: 'fk1.a' });
    expect(JSON.stringify(live.share)).not.toContain('bw1.owner');

    await moveFile(address, live.share.files[0].id, null, null);
    const afterMove = await getPublicFolderShare(share.id);
    expect(afterMove.status).toBe('active');
    if (afterMove.status !== 'active') throw new Error('expected active after move');
    expect(afterMove.share.files).toHaveLength(0);

    await revokeFolderShare(address, share.id);
    expect(await getPublicFolderShare(share.id)).toMatchObject({ status: 'revoked' });
  });
});
