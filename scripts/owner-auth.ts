/**
 * Browser-side owner auth for API mutations.
 */

import { signMessageDetailed } from './aptos-client';
import type { WalletAccount } from './types';

export type OwnerAuthPayload = {
  address: string;
  publicKey: string;
  message: string;
  nonce: string;
  fullMessage: string;
  signature: string;
  timestamp: number;
  purpose: 'upload' | 'library' | 'session';
  payloadHash: string;
};

export function buildAuthMessage(input: {
  address: string;
  purpose: 'upload' | 'library' | 'session';
  payloadHash: string;
  timestamp: number;
}): string {
  const addr = input.address.trim().toLowerCase().startsWith('0x')
    ? input.address.trim().toLowerCase()
    : `0x${input.address.trim().toLowerCase()}`;
  return [
    'BLOBBED_AUTH_V1',
    `address: ${addr}`,
    `purpose: ${input.purpose}`,
    `hash: ${input.payloadHash.toLowerCase()}`,
    `ts: ${input.timestamp}`,
  ].join('\n');
}

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  const arr = new Uint8Array(digest);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createOwnerAuth(
  wallet: WalletAccount,
  purpose: 'upload' | 'library' | 'session',
  payloadHash: string
): Promise<OwnerAuthPayload> {
  if (!wallet.publicKey) {
    throw new Error('Wallet public key required — disconnect and reconnect');
  }
  const timestamp = Date.now();
  const message = buildAuthMessage({
    address: wallet.address,
    purpose,
    payloadHash,
    timestamp,
  });
  const nonce = `blobbed-auth-${purpose}-${timestamp}`;
  const signed = await signMessageDetailed(message, { nonce });

  return {
    address: wallet.address,
    publicKey: wallet.publicKey,
    message,
    nonce,
    fullMessage: signed.fullMessage,
    signature: signed.signature,
    timestamp,
    purpose,
    payloadHash: payloadHash.toLowerCase(),
  };
}
