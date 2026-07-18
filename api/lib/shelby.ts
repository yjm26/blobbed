/**
 * Server-side Shelby client (Node).
 * Requires APTOS_PRIVATE_KEY at runtime for real uploads.
 * Private key can be added later — until then upload returns 503.
 */
import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';

export type ShelbyNetworkName = 'testnet' | 'shelbynet' | 'local';

function resolveNetwork(): Network.TESTNET | Network.SHELBYNET | Network.LOCAL {
  const n = (process.env.APTOS_NETWORK || process.env.SHELBY_NETWORK || 'shelbynet').toLowerCase();
  if (n === 'testnet') return Network.TESTNET;
  if (n === 'local') return Network.LOCAL;
  return Network.SHELBYNET;
}

let _client: ShelbyNodeClient | null = null;
let _account: Account | null = null;

export function isShelbyConfigured(): boolean {
  return Boolean(process.env.APTOS_PRIVATE_KEY?.trim());
}

export function getServiceAccount(): Account {
  const raw = process.env.APTOS_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error('APTOS_PRIVATE_KEY not set. Add a testnet private key to enable Shelby uploads.');
  }
  // Accept:
  // - AIP-80: ed25519-priv-0x…
  // - 0x + 64 hex
  // - bare 64 hex
  let hex = raw;
  const aip80 = raw.match(/ed25519-priv-(0x[0-9a-fA-F]+)/i);
  if (aip80) hex = aip80[1];
  else if (!raw.startsWith('0x')) hex = `0x${raw}`;
  const privateKey = new Ed25519PrivateKey(hex);
  return Account.fromPrivateKey({ privateKey });
}

export function getShelbyClient(): ShelbyNodeClient {
  if (_client) return _client;
  const apiKey = process.env.SHELBY_API_KEY || process.env.APTOS_API_KEY;
  _client = new ShelbyNodeClient({
    network: resolveNetwork(),
    ...(apiKey ? { apiKey } : {}),
  });
  return _client;
}

export function getOrCreateServiceAccount(): Account {
  if (_account) return _account;
  _account = getServiceAccount();
  return _account;
}

export function makeBlobName(ownerAddress: string, fileName: string): string {
  const owner = ownerAddress.replace(/^0x/i, '').slice(0, 12).toLowerCase();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'file';
  const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return `blobbed/${owner}/${id}_${safe}`;
}

/** Default expiry: 2 days from now (micros) — shelbynet often caps short expiries */
export function defaultExpirationMicros(days = 2): number {
  return Date.now() * 1000 + days * 24 * 60 * 60 * 1_000_000;
}

export async function uploadBlobToShelby(params: {
  blobData: Uint8Array;
  blobName: string;
  expirationMicros?: number;
}): Promise<{ storageAccount: string; blobName: string }> {
  const client = getShelbyClient();
  const signer = getOrCreateServiceAccount();
  const expirationMicros = params.expirationMicros ?? defaultExpirationMicros();

  await client.upload({
    blobData: params.blobData,
    signer,
    blobName: params.blobName,
    expirationMicros,
  });

  return {
    storageAccount: signer.accountAddress.toString(),
    blobName: params.blobName,
  };
}
