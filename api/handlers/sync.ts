import { getLibrary, dbStatus } from '../lib/db.js';

export async function handleSync(ownerAddress: string) {
  if (!ownerAddress) {
    return { status: 400, json: { error: 'Missing ownerAddress' } };
  }
  const lib = getLibrary(ownerAddress);
  return { status: 200, json: { ...lib, ...dbStatus() } };
}
