/**
 * Owner proof for mutating API calls (upload + library writes).
 * Mitigates anonymous burning of the service wallet / meta spoofing.
 */

import {
  Ed25519PublicKey,
  Ed25519Signature,
} from '@aptos-labs/ts-sdk';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export type OwnerAuthPayload = {
  address: string;
  publicKey: string;
  message: string;
  nonce: string;
  fullMessage: string;
  signature: string;
  timestamp: number;
  purpose: 'upload' | 'library' | 'session';
  /** sha256 hex of ciphertext (upload) or op digest (library) */
  payloadHash: string;
};

const MAX_SKEW_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2h

function normAddr(a: string): string {
  const s = a.trim().toLowerCase();
  return s.startsWith('0x') ? s : `0x${s}`;
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]*$/.test(h) || h.length % 2 !== 0) {
    throw new Error('Invalid hex');
  }
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function sigToBytes(sig: string): Uint8Array {
  const s = sig.trim();
  if (s.startsWith('0x')) {
    const bytes = hexToBytes(s);
    if (bytes.length === 64) return bytes;
    if (bytes.length > 64) return bytes.slice(bytes.length - 64);
    return bytes;
  }
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = Buffer.from(b64 + pad, 'base64');
    if (bin.length === 64) return new Uint8Array(bin);
    if (bin.length > 64) return new Uint8Array(bin.subarray(bin.length - 64));
    return new Uint8Array(bin);
  } catch {
    throw new Error('Invalid signature encoding');
  }
}

function pubToBytes(pk: string): Uint8Array {
  const s = pk.trim();
  if (s.startsWith('0x') || /^[0-9a-fA-F]+$/.test(s)) {
    const bytes = hexToBytes(s.startsWith('0x') ? s : `0x${s}`);
    if (bytes.length === 32) return bytes;
    if (bytes.length === 33 && bytes[0] === 0) return bytes.slice(1);
    if (bytes.length > 32) return bytes.slice(-32);
    return bytes;
  }
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = Buffer.from(b64 + pad, 'base64');
  if (bin.length === 32) return new Uint8Array(bin);
  if (bin.length > 32) return new Uint8Array(bin.subarray(bin.length - 32));
  return new Uint8Array(bin);
}

function addressFromEd25519Pub(pubBytes: Uint8Array): string {
  const key = new Ed25519PublicKey(pubBytes);
  return normAddr(key.authKey().derivedAddress().toString());
}

export function buildAuthMessage(input: {
  address: string;
  purpose: 'upload' | 'library' | 'session';
  payloadHash: string;
  timestamp: number;
}): string {
  return [
    'BLOBBED_AUTH_V1',
    `address: ${normAddr(input.address)}`,
    `purpose: ${input.purpose}`,
    `hash: ${input.payloadHash.toLowerCase()}`,
    `ts: ${input.timestamp}`,
  ].join('\n');
}

export type AuthVerifyResult =
  | { ok: true; address: string }
  | { ok: false; error: string; code: string };

export function verifyOwnerAuth(
  auth: OwnerAuthPayload | null | undefined,
  expected: {
    purpose: 'upload' | 'library' | 'session';
    payloadHash: string;
    address?: string;
  }
): AuthVerifyResult {
  if (!auth || typeof auth !== 'object') {
    return { ok: false, error: 'Missing owner auth', code: 'AUTH_REQUIRED' };
  }

  const address = normAddr(String(auth.address || ''));
  const purpose = auth.purpose;
  const payloadHash = String(auth.payloadHash || '').toLowerCase();
  const ts = Number(auth.timestamp);
  const fullMessage = String(auth.fullMessage || '');
  const message = String(auth.message || '');
  const signature = String(auth.signature || '');
  const publicKey = String(auth.publicKey || '');

  if (!address || !publicKey || !signature || !fullMessage) {
    return { ok: false, error: 'Incomplete auth payload', code: 'AUTH_INCOMPLETE' };
  }

  if (purpose !== expected.purpose) {
    return { ok: false, error: 'Auth purpose mismatch', code: 'AUTH_PURPOSE' };
  }

  if (payloadHash !== expected.payloadHash.toLowerCase()) {
    return { ok: false, error: 'Auth payload hash mismatch', code: 'AUTH_HASH' };
  }

  if (expected.address && normAddr(expected.address) !== address) {
    return { ok: false, error: 'Auth address mismatch', code: 'AUTH_ADDRESS' };
  }

  if (!Number.isFinite(ts)) {
    return { ok: false, error: 'Invalid auth timestamp', code: 'AUTH_TS' };
  }
  const skew = Math.abs(Date.now() - ts);
  if (skew > MAX_SKEW_MS) {
    return {
      ok: false,
      error: 'Auth expired or clock skew too large (5m)',
      code: 'AUTH_EXPIRED',
    };
  }

  const expectedMsg = buildAuthMessage({
    address,
    purpose,
    payloadHash,
    timestamp: ts,
  });
  if (message !== expectedMsg) {
    return { ok: false, error: 'Auth message mismatch', code: 'AUTH_MESSAGE' };
  }

  if (!fullMessage.includes(expectedMsg) && fullMessage !== expectedMsg) {
    if (
      !fullMessage.toLowerCase().includes(address) ||
      !fullMessage.toLowerCase().includes(payloadHash)
    ) {
      return {
        ok: false,
        error: 'fullMessage does not bind address/hash',
        code: 'AUTH_FULLMSG',
      };
    }
  }

  let pubBytes: Uint8Array;
  let sigBytes: Uint8Array;
  try {
    pubBytes = pubToBytes(publicKey);
    sigBytes = sigToBytes(signature);
  } catch {
    return { ok: false, error: 'Bad public key or signature encoding', code: 'AUTH_ENCODING' };
  }

  if (pubBytes.length !== 32 || sigBytes.length !== 64) {
    return {
      ok: false,
      error: `Bad key/sig length pk=${pubBytes.length} sig=${sigBytes.length}`,
      code: 'AUTH_LENGTH',
    };
  }

  try {
    const derived = addressFromEd25519Pub(pubBytes);
    if (derived !== address) {
      return {
        ok: false,
        error: 'Public key does not match address',
        code: 'AUTH_PK_ADDRESS',
      };
    }
  } catch {
    return { ok: false, error: 'Cannot derive address from public key', code: 'AUTH_PK' };
  }

  try {
    const pk = new Ed25519PublicKey(pubBytes);
    const sig = new Ed25519Signature(sigBytes);
    const msgBytes = new TextEncoder().encode(fullMessage);
    const ok = pk.verifySignature({ message: msgBytes, signature: sig });
    if (!ok) {
      return { ok: false, error: 'Invalid signature', code: 'AUTH_SIG' };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Signature verify failed',
      code: 'AUTH_VERIFY',
    };
  }

  return { ok: true, address };
}

function sessionSecret(): string {
  return (
    process.env.LIBRARY_SESSION_SECRET?.trim() ||
    process.env.APTOS_PRIVATE_KEY?.trim() ||
    'blobbed-dev-insecure-session'
  );
}

/** HMAC session ticket so library writes need 1 wallet sign / 2h, not per op. */
export function issueSessionToken(address: string): { token: string; exp: number } {
  const exp = Date.now() + SESSION_TTL_MS;
  const addr = normAddr(address);
  const body = `${addr}|${exp}`;
  const mac = createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return { token: `${body}|${mac}`, exp };
}

export function verifySessionToken(
  token: unknown,
  expectedAddress: string
): AuthVerifyResult {
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'Missing session token', code: 'SESSION_REQUIRED' };
  }
  const parts = token.split('|');
  if (parts.length !== 3) {
    return { ok: false, error: 'Malformed session token', code: 'SESSION_BAD' };
  }
  const [addr, expStr, mac] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return { ok: false, error: 'Session expired — unlock again', code: 'SESSION_EXPIRED' };
  }
  if (normAddr(addr) !== normAddr(expectedAddress)) {
    return { ok: false, error: 'Session address mismatch', code: 'SESSION_ADDRESS' };
  }
  const body = `${normAddr(addr)}|${exp}`;
  const expectMac = createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  try {
    const a = Buffer.from(mac);
    const b = Buffer.from(expectMac);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: 'Invalid session token', code: 'SESSION_MAC' };
    }
  } catch {
    return { ok: false, error: 'Invalid session token', code: 'SESSION_MAC' };
  }
  return { ok: true, address: normAddr(addr) };
}

/**
 * Accept either fresh wallet auth OR a valid session ticket for library mutations.
 */
export function verifyLibraryAccess(
  body: Record<string, unknown>,
  ownerAddress: string,
  op: string,
  detail: string
): AuthVerifyResult {
  // Prefer session token (no popup per op)
  if (body.sessionToken) {
    return verifySessionToken(body.sessionToken, ownerAddress);
  }
  // Fall back to full owner auth for this op
  const hash = createHash('sha256')
    .update(`library|${normAddr(ownerAddress)}|${op}|${detail}`)
    .digest('hex');
  return verifyOwnerAuth(body.auth as OwnerAuthPayload, {
    purpose: 'library',
    payloadHash: hash,
    address: ownerAddress,
  });
}

// ——— simple in-memory rate limit (best-effort on serverless) ———

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  b.count += 1;
  return { ok: true };
}

/** Sanitize thumbs before durable write — no plaintext data: URLs */
export function sanitizeThumbForStorage(thumb: unknown): string | undefined {
  if (thumb == null || thumb === '') return undefined;
  const s = String(thumb);
  if (s.startsWith('bt1.')) return s;
  if (s.startsWith('data:')) return undefined;
  return undefined;
}
