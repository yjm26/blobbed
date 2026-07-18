/**
 * Aptos wallet via Wallet Standard (AIP-62).
 * Do NOT use window.aptos / window.petra — deprecated.
 *
 * Session model:
 * - Wallet extension may stay "authorized" after disconnect.
 * - We only treat the user as logged-in when blobbed_session is set
 *   (set only after an explicit Connect click on the gate).
 *
 * @see https://aptos.dev/build/sdks/wallet-adapter/wallet-standards
 */
import { Network, Aptos } from '@aptos-labs/ts-sdk';
import {
  getAptosWallets,
  UserResponseStatus,
  type AptosWallet,
} from '@aptos-labs/wallet-standard';
import type { WalletAccount } from './types';

export const aptos = new Aptos({ network: Network.TESTNET });

const STORAGE_KEY = 'blobbed_wallet';
const STORAGE_WALLET_NAME = 'blobbed_wallet_name';
/** Set only after user explicitly connects on the gate page */
export const SESSION_KEY = 'blobbed_session';

let activeWallet: AptosWallet | null = null;

function refreshWallets(): AptosWallet[] {
  const { aptosWallets } = getAptosWallets();
  return aptosWallets || [];
}

function pickWallet(preferredName?: string | null): AptosWallet | null {
  const wallets = refreshWallets();
  if (!wallets.length) return null;

  if (preferredName) {
    const match = wallets.find((w) => w.name === preferredName);
    if (match) return match;
  }

  const petra = wallets.find((w) => /petra/i.test(w.name));
  if (petra) return petra;

  return wallets[0];
}

function accountToWalletAccount(account: {
  address: { toString(): string } | string;
  publicKey?: { toString(): string } | string;
}): WalletAccount {
  const address =
    typeof account.address === 'string'
      ? account.address
      : account.address.toString();
  let publicKey = '';
  if (account.publicKey) {
    publicKey =
      typeof account.publicKey === 'string'
        ? account.publicKey
        : account.publicKey.toString();
  }
  return { address, publicKey };
}

function isApproved<T>(res: {
  status: string;
  args?: T;
}): res is { status: typeof UserResponseStatus.APPROVED; args: T } {
  return res.status === UserResponseStatus.APPROVED || res.status === 'Approved';
}

function clearSessionStorage(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_WALLET_NAME);
  sessionStorage.removeItem(SESSION_KEY);
}

/** True only after explicit gate connect in this browser tab session. */
export function hasAppSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function markAppSession(address: string, walletName?: string): void {
  sessionStorage.setItem(SESSION_KEY, '1');
  sessionStorage.setItem(STORAGE_KEY, address);
  if (walletName) sessionStorage.setItem(STORAGE_WALLET_NAME, walletName);
}

/** Wait briefly for extensions to register on the page */
async function waitForWallets(ms = 400): Promise<AptosWallet[]> {
  let list = refreshWallets();
  if (list.length) return list;

  return new Promise((resolve) => {
    const { on } = getAptosWallets();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        remove();
      } catch {
        /* */
      }
      resolve(refreshWallets());
    };
    const remove = on('register', () => finish());
    setTimeout(finish, ms);
    setTimeout(() => {
      if (refreshWallets().length) finish();
    }, 100);
  });
}

/**
 * Interactive connect — always prompts (or wallet UI) when possible.
 * Sets app session on success.
 */
export async function connectWallet(): Promise<WalletAccount> {
  await waitForWallets(600);

  const preferred = sessionStorage.getItem(STORAGE_WALLET_NAME);
  const wallet = pickWallet(preferred);
  if (!wallet) {
    throw new Error('Petra wallet not installed');
  }

  const connectFn = wallet.features['aptos:connect']?.connect;
  if (!connectFn) {
    throw new Error(`Wallet ${wallet.name} does not support aptos:connect`);
  }

  // Explicit interactive connect — do NOT pass silent=true
  const response = await connectFn();
  if (!isApproved(response) || !response.args) {
    throw new Error('Connection rejected');
  }

  const args = response.args as
    | {
        address: { toString(): string } | string;
        publicKey?: { toString(): string } | string;
      }
    | Array<{
        address: { toString(): string } | string;
        publicKey?: { toString(): string } | string;
      }>;

  const accountInfo = Array.isArray(args) ? args[0] : args;
  if (!accountInfo) {
    throw new Error('Connected but no account returned');
  }

  activeWallet = wallet;
  const wa = accountToWalletAccount(accountInfo);
  if (!wa.address) throw new Error('Connected but empty address');

  markAppSession(wa.address, wallet.name);
  return wa;
}

/**
 * Read wallet account only if our app session is active.
 * Does not create a new login — silent re-read for same tab after connect.
 */
export async function getConnectedWallet(): Promise<WalletAccount | null> {
  if (!hasAppSession()) {
    return null;
  }

  await waitForWallets(300);

  const preferred = sessionStorage.getItem(STORAGE_WALLET_NAME);
  const wallet = pickWallet(preferred);
  if (!wallet) return null;

  // Prefer non-prompting account read
  const getAccount = wallet.features['aptos:account']?.account;
  if (typeof getAccount === 'function') {
    try {
      const acc = await getAccount();
      if (acc) {
        activeWallet = wallet;
        const wa = accountToWalletAccount(Array.isArray(acc) ? acc[0] : acc);
        if (wa.address) {
          sessionStorage.setItem(STORAGE_KEY, wa.address);
          return wa;
        }
      }
    } catch {
      /* not connected at wallet layer */
    }
  }

  // Silent reconnect only when app session already exists (same tab refresh)
  const connectFn = wallet.features['aptos:connect']?.connect;
  if (connectFn) {
    try {
      const silent = await connectFn(true);
      if (isApproved(silent) && silent.args) {
        const raw = silent.args as
          | {
              address: { toString(): string } | string;
              publicKey?: { toString(): string } | string;
            }
          | Array<{
              address: { toString(): string } | string;
              publicKey?: { toString(): string } | string;
            }>;
        const info = Array.isArray(raw) ? raw[0] : raw;
        if (info) {
          activeWallet = wallet;
          const wa = accountToWalletAccount(info);
          if (wa.address) {
            sessionStorage.setItem(STORAGE_KEY, wa.address);
            return wa;
          }
        }
      }
    } catch {
      /* fall through */
    }
  }

  const accounts = (wallet as unknown as { accounts?: readonly unknown[] }).accounts;
  if (accounts?.length) {
    activeWallet = wallet;
    const wa = accountToWalletAccount(
      accounts[0] as Parameters<typeof accountToWalletAccount>[0]
    );
    if (wa.address) {
      sessionStorage.setItem(STORAGE_KEY, wa.address);
      return wa;
    }
  }

  // Session flag stale — wallet no longer available
  return null;
}

export async function disconnectWallet(): Promise<void> {
  const preferred = sessionStorage.getItem(STORAGE_WALLET_NAME);
  const wallet = activeWallet || pickWallet(preferred);
  try {
    const disconnect = wallet?.features['aptos:disconnect']?.disconnect;
    if (disconnect) await disconnect();
  } catch {
    /* ignore wallet errors — still clear our session */
  }
  activeWallet = null;
  clearSessionStorage();
}

export async function signMessage(message: string): Promise<string> {
  if (!hasAppSession()) throw new Error('Wallet not connected');

  const preferred = sessionStorage.getItem(STORAGE_WALLET_NAME);
  const wallet = activeWallet || pickWallet(preferred);
  if (!wallet) throw new Error('Wallet not connected');

  const sign = wallet.features['aptos:signMessage']?.signMessage;
  if (!sign) throw new Error('Wallet does not support signMessage');

  const res = await sign({
    message,
    nonce: String(Date.now()),
  });
  if (!isApproved(res) || !res.args) {
    throw new Error('Sign rejected');
  }
  const out = res.args as { signature?: { toString(): string } | string };
  const sig = out.signature;
  return typeof sig === 'string' ? sig : sig?.toString?.() || String(sig);
}

export function listDetectedWallets(): string[] {
  return refreshWallets().map((w) => w.name);
}
