/**
 * Aptos wallet via Wallet Standard (AIP-62).
 * Do NOT use window.aptos / window.petra — deprecated.
 *
 * @see https://aptos.dev/build/sdks/wallet-adapter/wallet-standards
 * @see https://github.com/aptos-labs/wallet-standard
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

  // Prefer Petra
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

function isApproved<T>(res: { status: string; args?: T }): res is { status: typeof UserResponseStatus.APPROVED; args: T } {
  return res.status === UserResponseStatus.APPROVED || res.status === 'Approved';
}

/** Wait briefly for extensions to register on the page */
async function waitForWallets(ms = 400): Promise<AptosWallet[]> {
  const start = Date.now();
  let list = refreshWallets();
  if (list.length) return list;

  return new Promise((resolve) => {
    const { on } = getAptosWallets();
    const done = () => {
      remove();
      resolve(refreshWallets());
    };
    const remove = on('register', () => {
      done();
    });
    setTimeout(() => {
      remove();
      resolve(refreshWallets());
    }, ms);
    // also poll once
    setTimeout(() => {
      list = refreshWallets();
      if (list.length) done();
    }, 100);
    void start;
  });
}

export async function connectWallet(): Promise<WalletAccount> {
  await waitForWallets(500);

  const preferred = sessionStorage.getItem(STORAGE_WALLET_NAME);
  const wallet = pickWallet(preferred);
  if (!wallet) {
    throw new Error('Petra wallet not installed');
  }

  // features: aptos:connect
  const connectFn = wallet.features['aptos:connect']?.connect;
  if (!connectFn) {
    throw new Error(`Wallet ${wallet.name} does not support aptos:connect`);
  }

  const response = await connectFn();
  if (!isApproved(response) || !response.args) {
    throw new Error('Connection rejected');
  }

  // args is AccountInfo or AccountInfo[]
  const args = response.args as
    | { address: { toString(): string } | string; publicKey?: { toString(): string } | string }
    | Array<{ address: { toString(): string } | string; publicKey?: { toString(): string } | string }>;

  const accountInfo = Array.isArray(args) ? args[0] : args;
  if (!accountInfo) {
    throw new Error('Connected but no account returned');
  }

  activeWallet = wallet;
  const wa = accountToWalletAccount(accountInfo);
  sessionStorage.setItem(STORAGE_KEY, wa.address);
  sessionStorage.setItem(STORAGE_WALLET_NAME, wallet.name);
  return wa;
}

/** Silent reconnect / account read — no popup if already authorized */
export async function getConnectedWallet(): Promise<WalletAccount | null> {
  await waitForWallets(300);

  const preferred = sessionStorage.getItem(STORAGE_WALLET_NAME);
  const wallet = pickWallet(preferred);
  if (!wallet) return null;

  // Try silent connect first (re-auth without popup when possible)
  const connectFn = wallet.features['aptos:connect']?.connect;
  if (connectFn) {
    try {
      const silent = await connectFn(true);
      if (isApproved(silent) && silent.args) {
        activeWallet = wallet;
        const wa = accountToWalletAccount(silent.args as any);
        if (wa.address) {
          sessionStorage.setItem(STORAGE_KEY, wa.address);
          return wa;
        }
      }
    } catch {
      /* fall through */
    }
  }

  // Try getAccount feature (no popup)
  const getAccount = wallet.features['aptos:account']?.account;

  if (typeof getAccount === 'function') {
    try {
      const acc = await getAccount();
      if (acc) {
        activeWallet = wallet;
        const wa = accountToWalletAccount(
          Array.isArray(acc) ? acc[0] : acc
        );
        if (wa.address) {
          sessionStorage.setItem(STORAGE_KEY, wa.address);
          return wa;
        }
      }
    } catch {
      /* not connected */
    }
  }

  // Some wallets expose accounts on the wallet object after prior connect
  const accounts = (wallet as { accounts?: Array<{ address: string | { toString(): string }; publicKey?: unknown }> }).accounts;
  if (accounts?.length) {
    activeWallet = wallet;
    const wa = accountToWalletAccount(accounts[0] as any);
    sessionStorage.setItem(STORAGE_KEY, wa.address);
    return wa;
  }

  return null;
}

export async function disconnectWallet(): Promise<void> {
  const preferred = sessionStorage.getItem(STORAGE_WALLET_NAME);
  const wallet = activeWallet || pickWallet(preferred);
  try {
    const disconnect = wallet?.features['aptos:disconnect']?.disconnect;
    if (disconnect) await disconnect();
  } catch {
    /* ignore */
  }
  activeWallet = null;
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_WALLET_NAME);
}

export async function signMessage(message: string): Promise<string> {
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
