import { ShelbyClient } from '@shelby-protocol/sdk/browser';
import { Network } from '@aptos-labs/ts-sdk';

/** Browser Shelby client - download only (upload goes through backend relay). */
function resolveNetwork(): Network {
  const n = (import.meta as any).env?.VITE_APTOS_NETWORK?.toLowerCase?.() || 'shelbynet';
  if (n === 'testnet') return Network.TESTNET;
  if (n === 'local') return Network.LOCAL;
  return Network.SHELBYNET;
}

let _client: ShelbyClient | null = null;

export function getBrowserShelbyClient(): ShelbyClient {
  if (_client) return _client;
  const apiKey = (import.meta as any).env?.VITE_SHELBY_API_KEY as string | undefined;
  _client = new ShelbyClient({
    network: resolveNetwork() as any,
    ...(apiKey ? { apiKey } : {}),
  });
  return _client;
}

/**
 * Download ciphertext stream from Shelby.
 * @param storageAccount - Aptos address that registered the blob (service wallet)
 * @param blobName - path used at upload time
 */
export async function downloadFromShelby(
  storageAccount: string,
  blobName: string
): Promise<ReadableStream<Uint8Array>> {
  const client = getBrowserShelbyClient();
  const blob = await client.download({
    account: storageAccount,
    blobName,
  });
  return blob.readable;
}

/**
 * @deprecated Upload must go through /api/upload (backend relay).
 * Kept so old imports don't crash - throws with clear message.
 */
export async function uploadToShelby(
  _data: Uint8Array,
  _account: { address: string },
  _blobName: string
): Promise<string> {
  throw new Error(
    'Direct browser upload is disabled. Use uploadFile() → /api/upload (service wallet).'
  );
}
