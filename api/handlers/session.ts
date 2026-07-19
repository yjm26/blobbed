import { createHash } from 'crypto';
import {
  verifyOwnerAuth,
  issueSessionToken,
  rateLimit,
  type OwnerAuthPayload,
} from '../lib/owner-auth.js';

function normAddr(a: string): string {
  const s = String(a || '').trim().toLowerCase();
  return s.startsWith('0x') ? s : `0x${s}`;
}

/**
 * Mint HMAC library session (1 wallet sign / ~2h).
 * Frontend: ensureLibrarySession → op: 'session' + auth purpose session.
 */
export async function handleSession(
  body: Record<string, unknown>,
  ownerAddress: string
) {
  const address = normAddr(
    ownerAddress || String(body.ownerAddress || body.address || '')
  );
  if (!address || address === '0x') {
    return {
      status: 400,
      json: { error: 'Missing ownerAddress', code: 'BAD_REQUEST' },
    };
  }

  const rl = rateLimit(`session:${address}`, 10, 60_000);
  if (!rl.ok) {
    return {
      status: 429,
      json: {
        error: 'Too many session attempts',
        code: 'RATE_LIMIT',
        retryAfterSec: rl.retryAfterSec,
      },
    };
  }

  const expectedHash = createHash('sha256')
    .update(`session|${address}`)
    .digest('hex');

  const verified = verifyOwnerAuth(body.auth as OwnerAuthPayload, {
    purpose: 'session',
    payloadHash: expectedHash,
    address,
  });
  if (!verified.ok) {
    return {
      status: 401,
      json: { error: verified.error, code: verified.code },
    };
  }

  try {
    const { token, exp } = issueSessionToken(verified.address);
    return {
      status: 200,
      json: { token, exp, address: verified.address },
    };
  } catch {
    return {
      status: 503,
      json: {
        error: 'Session service unavailable',
        code: 'SESSION_CONFIG',
      },
    };
  }
}
