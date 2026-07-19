import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbStatus, isDatabaseConfigured } from './lib/db.js';
import {
  getOrCreateServiceAccount,
  isShelbyConfigured,
} from './lib/shelby.js';

/**
 * GET /api/status — public health (no secrets).
 * Used by drive UI + ops checklist.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const network =
    process.env.APTOS_NETWORK || process.env.SHELBY_NETWORK || 'shelbynet';
  const shelbyConfigured = isShelbyConfigured();
  let serviceAddress: string | null = null;
  let shelbyError: string | null = null;

  if (shelbyConfigured) {
    try {
      serviceAddress = getOrCreateServiceAccount().accountAddress.toString();
    } catch (e) {
      shelbyError = e instanceof Error ? e.message.slice(0, 120) : 'bad key';
    }
  }

  const db = dbStatus();
  const maxUpload = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
  const uploadMaxPerHour = Number(process.env.UPLOAD_MAX_PER_HOUR || 30);
  const hasSessionSecret = Boolean(
    process.env.LIBRARY_SESSION_SECRET?.trim() ||
      process.env.APTOS_PRIVATE_KEY?.trim()
  );

  const ready =
    db.configured &&
    shelbyConfigured &&
    !shelbyError &&
    network.toLowerCase() === 'shelbynet';

  return res.status(200).json({
    ok: true,
    ready,
    time: new Date().toISOString(),
    db: {
      configured: isDatabaseConfigured(),
      backend: db.backend,
    },
    shelby: {
      configured: shelbyConfigured,
      network,
      serviceAddress,
      error: shelbyError,
      faucetHint:
        'https://docs.shelby.xyz/tools/wallets/petra-setup',
    },
    auth: {
      uploadOwnerAuth: true,
      librarySession: true,
      sessionSecretConfigured: hasSessionSecret,
    },
    limits: {
      maxUploadBytes: maxUpload,
      uploadMaxPerHour,
    },
    security: {
      csp: true,
      plainThumbsRejected: true,
      legacyMutationsLocked: true,
      libraryReadAuth: true,
      corsStrict: true,
      originsConfigured: Boolean(process.env.CORS_ORIGINS?.trim()),
    },
    checks: {
      neon: db.backend === 'neon',
      shelbyKey: shelbyConfigured && !shelbyError,
      shelbynet: network.toLowerCase() === 'shelbynet',
    },
  });
}
