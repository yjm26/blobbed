import type { FileMetadata, FolderMetadata, WalletAccount } from './types';
import {
  addFile,
  enableFolderShareRemote,
  loadLibrary,
  saveLibrary,
  syncLibrary,
} from './library-store';
import {
  generateFolderKey,
  unwrapFileKey,
  wrapFileKey,
  wrapFolderFileKey,
} from './key-wrap';
import { ensureVaultUnlocked } from './vault';
import { generateLiveFolderShareLink } from './share';

export type PreparedLiveFolderShare = {
  link: string;
  shareId: string;
  folderKey: Uint8Array;
  filesWrapped: number;
};

async function folderKeyForShare(
  ownerAddress: string,
  wallet: WalletAccount,
  folder: FolderMetadata
): Promise<Uint8Array> {
  const vault = await ensureVaultUnlocked(wallet);
  if (folder.folderKeyWrapped) {
    return unwrapFileKey(folder.folderKeyWrapped, vault);
  }
  const fk = generateFolderKey();
  const wrapped = await wrapFileKey(fk, vault);
  const lib = loadLibrary(ownerAddress);
  const target = lib.folders.find((f) => f.id === folder.id);
  if (target) target.folderKeyWrapped = wrapped;
  saveLibrary(ownerAddress, lib);
  await syncLibrary(ownerAddress, lib);
  folder.folderKeyWrapped = wrapped;
  return fk;
}

export async function wrapFileForLiveFolder(
  file: FileMetadata,
  folderKey: Uint8Array,
  wallet: WalletAccount
): Promise<FileMetadata> {
  const vault = await ensureVaultUnlocked(wallet);
  const rawDek = await unwrapFileKey(file.encryptedKey, vault);
  const folderWrappedKey = await wrapFolderFileKey(rawDek, folderKey);
  return { ...file, folderWrappedKey };
}

export async function prepareLiveFolderShare(
  ownerAddress: string,
  wallet: WalletAccount,
  folder: FolderMetadata,
  files: FileMetadata[]
): Promise<PreparedLiveFolderShare> {
  const folderKey = await folderKeyForShare(ownerAddress, wallet, folder);
  let filesWrapped = 0;

  for (const file of files) {
    if (file.folderWrappedKey?.startsWith('fk1.')) continue;
    const next = await wrapFileForLiveFolder(file, folderKey, wallet);
    await addFile(ownerAddress, next);
    filesWrapped++;
  }

  const share = await enableFolderShareRemote(ownerAddress, folder.id);
  return {
    shareId: share.id,
    folderKey,
    filesWrapped,
    link: generateLiveFolderShareLink(share.id, folderKey),
  };
}
