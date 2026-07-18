import { describe, it, expect } from 'vitest';
import {
  deriveVaultKey,
  wrapFileKey,
  unwrapFileKey,
  isWrappedKey,
  detectKeyEncoding,
  signatureToBytes,
  rawKeyToBase64,
  base64ToRawKey,
  wrapThumbDataUrl,
  unwrapThumbDataUrl,
  isWrappedThumb,
  isPlainThumbDataUrl,
} from '../scripts/key-wrap';
import { generateKey, keyToBase64, base64ToKey } from '../scripts/crypto';
import { buildAuthMessage, sha256Hex } from '../scripts/owner-auth';

describe('key-wrap', () => {
  it('detects plain vs wallet-v1', () => {
    expect(detectKeyEncoding(keyToBase64(generateKey()))).toBe('plain');
    expect(isWrappedKey('bw1.abc')).toBe(true);
    expect(isWrappedKey('notwrapped')).toBe(false);
  });

  it('signatureToBytes accepts hex and base64', () => {
    const hex = '0x' + 'ab'.repeat(64);
    expect(signatureToBytes(hex).length).toBe(64);
    const raw = new Uint8Array(64).fill(7);
    const b64 = btoa(String.fromCharCode(...raw));
    expect(signatureToBytes(b64)).toEqual(raw);
  });

  it('deriveVaultKey is deterministic for same inputs', async () => {
    const sig = '0x' + 'cd'.repeat(64);
    const a = await deriveVaultKey('0xABC', sig);
    const b = await deriveVaultKey('0xabc', sig);
    const dek = generateKey();
    const w1 = await wrapFileKey(dek, a);
    const plain = await unwrapFileKey(w1, b);
    expect(plain).toEqual(dek);
  });

  it('different address → different vault key', async () => {
    const sig = '0x' + '11'.repeat(64);
    const k1 = await deriveVaultKey('0xaaa', sig);
    const k2 = await deriveVaultKey('0xbbb', sig);
    const dek = generateKey();
    const wrapped = await wrapFileKey(dek, k1);
    await expect(unwrapFileKey(wrapped, k2)).rejects.toThrow(/unwrap|wallet/i);
  });

  it('wrap / unwrap round-trip', async () => {
    const vault = await deriveVaultKey('0x1234', '0x' + 'ef'.repeat(64));
    const dek = generateKey();
    const stored = await wrapFileKey(dek, vault);
    expect(stored.startsWith('bw1.')).toBe(true);
    const out = await unwrapFileKey(stored, vault);
    expect(out).toEqual(dek);
  });

  it('legacy plain unwrap without vault', async () => {
    const dek = generateKey();
    const plain = keyToBase64(dek);
    const out = await unwrapFileKey(plain, null);
    expect(out).toEqual(dek);
  });

  it('wrapped requires vault', async () => {
    const vault = await deriveVaultKey('0x1', '0x' + '22'.repeat(64));
    const stored = await wrapFileKey(generateKey(), vault);
    await expect(unwrapFileKey(stored, null)).rejects.toThrow(/Vault locked/i);
  });

  it('rawKey base64 helpers', () => {
    const dek = generateKey();
    const b64 = rawKeyToBase64(dek);
    expect(base64ToRawKey(b64)).toEqual(dek);
    expect(base64ToKey(b64)).toEqual(dek);
  });

  it('thumb wrap / unwrap', async () => {
    const vault = await deriveVaultKey('0xthumb', '0x' + '33'.repeat(64));
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    expect(isPlainThumbDataUrl(dataUrl)).toBe(true);
    const sealed = await wrapThumbDataUrl(dataUrl, vault);
    expect(isWrappedThumb(sealed)).toBe(true);
    expect(sealed.startsWith('data:')).toBe(false);
    const open = await unwrapThumbDataUrl(sealed, vault);
    expect(open).toBe(dataUrl);
  });
});

describe('owner-auth message', () => {
  it('buildAuthMessage is stable', () => {
    const m = buildAuthMessage({
      address: '0xAbC',
      purpose: 'upload',
      payloadHash: 'aa',
      timestamp: 1,
    });
    expect(m).toContain('address: 0xabc');
    expect(m).toContain('purpose: upload');
    expect(m).toContain('hash: aa');
  });

  it('sha256Hex', async () => {
    const h = await sha256Hex('abc');
    expect(h).toHaveLength(64);
  });
});
