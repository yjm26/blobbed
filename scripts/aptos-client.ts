import { Network, Aptos } from '@aptos-labs/ts-sdk';
import type { WalletAccount } from './types';

const aptos = new Aptos({ network: Network.TESTNET });

export async function connectWallet(): Promise<WalletAccount> {
  if (!window.aptos) {
    throw new Error('Petra wallet not installed');
  }
  const response = await window.aptos.connect();
  return {
    address: response.address,
    publicKey: response.publicKey,
  };
}

/** Silent check — no connect popup */
export async function getConnectedWallet(): Promise<WalletAccount | null> {
  if (!window.aptos) return null;
  try {
    const connected = await window.aptos.isConnected?.();
    if (connected === false) return null;
    const acc = await window.aptos.account?.();
    if (!acc?.address) return null;
    return {
      address: acc.address,
      publicKey: acc.publicKey || '',
    };
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  try {
    await window.aptos?.disconnect?.();
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem('blobbed_wallet');
}

export async function signMessage(message: string): Promise<string> {
  if (!window.aptos) {
    throw new Error('Wallet not connected');
  }
  const response = await window.aptos.signMessage({ message });
  return response.signature;
}

export { aptos };

declare global {
  interface Window {
    aptos?: {
      connect: () => Promise<{ address: string; publicKey: string }>;
      disconnect?: () => Promise<void>;
      isConnected?: () => Promise<boolean>;
      account?: () => Promise<{ address: string; publicKey?: string }>;
      signMessage: (args: { message: string }) => Promise<{ signature: string }>;
    };
  }
}
