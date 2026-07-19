import { describe, it, expect, afterEach } from 'vitest';
import {
  isProductionEnv,
  getSessionSecret,
  issueSessionToken,
  verifySessionToken,
} from '../api/lib/owner-auth';
import { parseCorsAllowlist, resolveAllowedOrigin } from '../api/lib/cors';

const ENV_KEYS = [
  'NODE_ENV',
  'RENDER',
  'BLOBED_ENV',
  'LIBRARY_SESSION_SECRET',
  'APTOS_PRIVATE_KEY',
  'CORS_ORIGINS',
] as const;

describe('session secret', () => {
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (k in saved) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
        delete saved[k];
      }
    }
  });

  function setEnv(key: (typeof ENV_KEYS)[number], value: string | undefined) {
    if (!(key in saved)) saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  it('dev allows insecure fallback when no secret', () => {
    setEnv('NODE_ENV', 'development');
    setEnv('RENDER', undefined);
    setEnv('BLOBED_ENV', undefined);
    setEnv('LIBRARY_SESSION_SECRET', undefined);
    setEnv('APTOS_PRIVATE_KEY', undefined);
    expect(isProductionEnv()).toBe(false);
    expect(getSessionSecret()).toBe('blobbed-dev-insecure-session');
    const { token } = issueSessionToken('0xabc');
    expect(token.split('|')).toHaveLength(3);
  });

  it('production refuses missing secret', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('LIBRARY_SESSION_SECRET', undefined);
    setEnv('APTOS_PRIVATE_KEY', undefined);
    expect(() => getSessionSecret()).toThrow(/LIBRARY_SESSION_SECRET/);
  });

  it('production uses LIBRARY_SESSION_SECRET', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('LIBRARY_SESSION_SECRET', 'test-secret-please-rotate');
    setEnv('APTOS_PRIVATE_KEY', undefined);
    const a = issueSessionToken('0xAbC');
    const v = verifySessionToken(a.token, '0xabc');
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.address).toBe('0xabc');
  });

  it('session token rejects wrong address', () => {
    setEnv('NODE_ENV', 'development');
    setEnv('LIBRARY_SESSION_SECRET', 'dev-secret');
    const a = issueSessionToken('0xaaa');
    const v = verifySessionToken(a.token, '0xbbb');
    expect(v.ok).toBe(false);
  });
});

describe('cors origin', () => {
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (k in saved) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
        delete saved[k];
      }
    }
  });

  function setEnv(key: (typeof ENV_KEYS)[number], value: string | undefined) {
    if (!(key in saved)) saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  it('allows exact match', () => {
    expect(
      resolveAllowedOrigin('https://blobbed.onrender.com', [
        'https://blobbed.onrender.com',
      ])
    ).toBe('https://blobbed.onrender.com');
  });

  it('rejects unknown origin', () => {
    expect(
      resolveAllowedOrigin('https://evil.example', [
        'https://blobbed.onrender.com',
      ])
    ).toBeNull();
  });

  it('missing origin → null', () => {
    expect(
      resolveAllowedOrigin(undefined, ['https://blobbed.onrender.com'])
    ).toBeNull();
  });

  it('same-host reflect when allowlist empty', () => {
    expect(
      resolveAllowedOrigin(
        'https://blobbed.onrender.com',
        [],
        'blobbed.onrender.com'
      )
    ).toBe('https://blobbed.onrender.com');
  });

  it('parseCorsAllowlist reads CORS_ORIGINS', () => {
    setEnv('CORS_ORIGINS', 'https://a.example, http://localhost:5173/');
    expect(parseCorsAllowlist()).toEqual([
      'https://a.example',
      'http://localhost:5173',
    ]);
  });
});
