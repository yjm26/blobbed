import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  isShelbyConfigured,
  makeBlobName,
  uploadBlobToShelby,
} from './lib/shelby.js';
import {
  rateLimit,
  verifyOwnerAuth,
  type OwnerAuthPayload,
} from './lib/owner-auth.js';
import { createHash } from 'crypto';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

/**
 * POST /api/upload
 * Body: { encryptedBase64, fileName, ownerAddress, fileSize?, auth }
 *
 * Encrypt already done client-side. Backend relays ciphertext to Shelby
 * using service wallet (APTOS_PRIVATE_KEY) on shelbynet.
 * Never accepts file DEKs / plaintext — keys stay client-side (wrapped in library meta).
 *
 * Requires wallet owner auth so random clients cannot burn service wallet funds.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!isShelbyConfigured()) {
      return res.status(503).json({
        error: 'Shelby upload not configured',
        code: 'MISSING_APTOS_PRIVATE_KEY',
        hint: 'Set APTOS_PRIVATE_KEY (service wallet) + APTOS_NETWORK=shelbynet on Vercel, then redeploy.',
      });
    }

    const {
      encryptedBase64,
      fileName,
      ownerAddress,
      fileSize,
      auth,
    } = req.body || {};
    if (!encryptedBase64 || !fileName || !ownerAddress) {
      return res.status(400).json({
        error: 'Missing fields: encryptedBase64, fileName, ownerAddress',
      });
    }

    const blobData = Uint8Array.from(Buffer.from(String(encryptedBase64), 'base64'));
    const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
    if (blobData.length > maxBytes) {
      return res.status(413).json({
        error: `Max encrypted payload ${Math.floor(maxBytes / (1024 * 1024))}MB`,
      });
    }

    const payloadHash = createHash('sha256').update(Buffer.from(blobData)).digest('hex');
    const verified = verifyOwnerAuth(auth as OwnerAuthPayload, {
      purpose: 'upload',
      payloadHash,
      address: String(ownerAddress),
    });
    if (!verified.ok) {
      return res.status(401).json({
        error: verified.error,
        code: verified.code,
        hint: 'Sign the upload challenge with your wallet (owner auth).',
      });
    }

    const perHour = Number(process.env.UPLOAD_MAX_PER_HOUR || 30);
    const rl = rateLimit(
      `upload:${verified.address}`,
      perHour,
      60 * 60 * 1000
    );
    if (!rl.ok) {
      return res.status(429).json({
        error: `Upload rate limit (${perHour}/hour). Retry in ${rl.retryAfterSec}s`,
        code: 'RATE_LIMIT',
        retryAfterSec: rl.retryAfterSec,
      });
    }

    const blobName = makeBlobName(verified.address, String(fileName));
    const result = await uploadBlobToShelby({ blobData, blobName });

    return res.status(200).json({
      success: true,
      storageAccount: result.storageAccount,
      blobName: result.blobName,
      blobHash: result.blobName,
      ownerAddress: verified.address,
      fileName,
      fileSize: fileSize ?? blobData.length,
      network: process.env.APTOS_NETWORK || process.env.SHELBY_NETWORK || 'shelbynet',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Upload error:', err);

    if (/E_INSUFFICIENT_FUNDS|insufficient funds/i.test(message)) {
      return res.status(402).json({
        error: 'Service wallet needs ShelbyUSD (storage) + APT (gas) on shelbynet',
        code: 'INSUFFICIENT_FUNDS',
        hint:
          '1) Set APTOS_NETWORK=shelbynet on Vercel. 2) Fund ShelbyUSD + APT: https://docs.shelby.xyz/tools/wallets/petra-setup — paste service wallet address. 3) Redeploy.',
        detail: message.slice(0, 400),
      });
    }

    return res.status(500).json({ error: message.slice(0, 500) });
  }
}
