/**
 * Session vault: one wallet signMessage unlocks a derived AES key used to
 * wrap/unwrap file DEKs + thumbs at rest (Neon / localStorage).
 *
 * Security:
 * - Vault key lives ONLY in process memory (not sessionStorage / localStorage)
 * - Refresh / new tab → must sign again
 * - Cleared on disconnect / lock
 * - Share links still use raw DEKs in #fragment (never server-side)
 */

import { signMessage } from './aptos-client';
import {
  deriveVaultKey,
  isWrappedKey,
  isWrappedThumb,
  isPlainThumbDataUrl,
  unwrapFileKey,
  wrapFileKey,
  wrapThumbDataUrl,
  unwrapThumbDataUrl,
  rawKeyToBase64,
  base64ToRawKey,
  type KeyEncoding,
  detectKeyEncoding,
} from './key-wrap';
import type { FileMetadata, WalletAccount } from './types';
import { addFile, listAllFiles } from './library-store';

export const VAULT_MESSAGE =
  'Blobbed library encryption v1\n\nSign to derive a key that wraps your file keys at rest.\nThis does not move funds.';
/** Fixed nonce → deterministic signature for key derivation (same wallet). */
export const VAULT_NONCE = 'blobbed-vault-v1';

/** Legacy prefix - purged on clear so old sessions do not leave sigs around */
const LEGACY_SESSION_PREFIX = 'blobbed_vault_sig_v1_';

type VaultState = {
  address: string;
  key: CryptoKey;
};

let mem: VaultState | null = null;

export function isVaultUnlocked(address?: string): boolean {
  if (!mem) return false;
  if (!address) return true;
  return mem.address === address.trim().toLowerCase();
}

export function getVaultKey(): CryptoKey | null {
  return mem?.key ?? null;
}

export function lockVault(): void {
  mem = null;
}

function purgeLegacySigStorage(): void {
  try {
    const kill: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(LEGACY_SESSION_PREFIX)) kill.push(k);
    }
    for (const k of kill) sessionStorage.removeItem(k);
  } catch {
    /* */
  }
}

/** Drop in-memory vault + purge any legacy signature caches. */
export function clearVaultSession(_address?: string): void {
  mem = null;
  purgeLegacySigStorage();
}

async function unlockFromSignature(
  address: string,
  signature: string
): Promise<CryptoKey> {
  const key = await deriveVaultKey(address, signature);
  mem = { address: address.trim().toLowerCase(), key };
  // Intentionally NOT persisting signature anywhere durable.
  purgeLegacySigStorage();
  return key;
}

/**
 * Unlock vault for owner. Memory-only - prompts sign when not unlocked
 * (including after full page reload).
 */
export async function ensureVaultUnlocked(
  wallet: WalletAccount,
  opts?: { forcePrompt?: boolean }
): Promise<CryptoKey> {
  const address = wallet.address;
  const addr = address.trim().toLowerCase();

  if (!opts?.forcePrompt && mem && mem.address === addr) {
    return mem.key;
  }

  if (opts?.forcePrompt) {
    mem = null;
  }

  const signature = await signMessage(VAULT_MESSAGE, { nonce: VAULT_NONCE });
  if (!signature) throw new Error('Empty signature from wallet');
  return unlockFromSignature(address, signature);
}

/** Resolve stored encryptedKey → raw base64 DEK for decrypt/share */
export async function resolveRawKeyBase64(
  stored: string,
  wallet?: WalletAccount | null
): Promise<string> {
  if (!stored) throw new Error('Missing file key');

  if (!isWrappedKey(stored)) {
    return stored;
  }

  let vault = getVaultKey();
  if (!vault && wallet) {
    vault = await ensureVaultUnlocked(wallet);
  }
  if (!vault) {
    throw new Error('Vault locked - connect & sign to unlock keys');
  }

  const raw = await unwrapFileKey(stored, vault);
  return rawKeyToBase64(raw);
}

export async function wrapRawKeyBase64(
  rawKeyB64: string,
  wallet: WalletAccount
): Promise<string> {
  const vault = await ensureVaultUnlocked(wallet);
  const raw = base64ToRawKey(rawKeyB64);
  return wrapFileKey(raw, vault);
}

/** Encrypt a plain data-URL thumb for storage */
export async function sealThumb(
  dataUrl: string | null | undefined,
  wallet: WalletAccount
): Promise<string | undefined> {
  if (!dataUrl) return undefined;
  if (isWrappedThumb(dataUrl)) return dataUrl;
  const vault = await ensureVaultUnlocked(wallet);
  return wrapThumbDataUrl(dataUrl, vault);
}

/** Decrypt thumb for UI grid (null if locked / missing) */
export async function openThumb(
  stored: string | undefined | null,
  wallet?: WalletAccount | null
): Promise<string | null> {
  if (!stored) return null;
  if (stored.startsWith('data:')) return stored;
  let vault = getVaultKey();
  if (!vault && wallet) {
    try {
      vault = await ensureVaultUnlocked(wallet);
    } catch {
      return null;
    }
  }
  if (!vault) return null;
  try {
    return await unwrapThumbDataUrl(stored, vault);
  } catch {
    return null;
  }
}

export function keyEncodingOf(file: FileMetadata): KeyEncoding {
  return detectKeyEncoding(file.encryptedKey || '');
}

/**
 * Lazy migrate legacy plain keys + plain thumbs → wallet-wrapped.
 */
export async function migratePlainKeys(
  wallet: WalletAccount
): Promise<{ migrated: number; failed: number; thumbs: number }> {
  const vault = await ensureVaultUnlocked(wallet);
  const files = listAllFiles(wallet.address);
  let migrated = 0;
  let failed = 0;
  let thumbs = 0;

  for (const f of files) {
    let next: FileMetadata | null = null;

    if (f.encryptedKey && !isWrappedKey(f.encryptedKey)) {
      try {
        const raw = await unwrapFileKey(f.encryptedKey, null);
        const wrapped = await wrapFileKey(raw, vault);
        next = { ...(next || f), encryptedKey: wrapped };
        migrated++;
      } catch {
        failed++;
      }
    }

    const thumbSrc = (next || f).thumbDataUrl;
    if (isPlainThumbDataUrl(thumbSrc)) {
      try {
        const sealed = await wrapThumbDataUrl(thumbSrc!, vault);
        next = { ...(next || f), thumbDataUrl: sealed };
        thumbs++;
      } catch {
        // drop plaintext thumb rather than keep leaking
        next = { ...(next || f), thumbDataUrl: undefined };
        thumbs++;
      }
    }

    if (next) {
      try {
        await addFile(wallet.address, next);
      } catch {
        failed++;
      }
    }
  }

  return { migrated, failed, thumbs };
}

export function countKeyEncodings(files: FileMetadata[]): {
  plain: number;
  wrapped: number;
  plainThumbs: number;
  wrappedThumbs: number;
} {
  let plain = 0;
  let wrapped = 0;
  let plainThumbs = 0;
  let wrappedThumbs = 0;
  for (const f of files) {
    if (isWrappedKey(f.encryptedKey || '')) wrapped++;
    else if (f.encryptedKey) plain++;
    if (isPlainThumbDataUrl(f.thumbDataUrl)) plainThumbs++;
    else if (f.thumbDataUrl && isWrappedThumb(f.thumbDataUrl)) wrappedThumbs++;
  }
  return { plain, wrapped, plainThumbs, wrappedThumbs };
}
