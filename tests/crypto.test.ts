import { describe, it, expect } from 'vitest';
import { generateKey, encryptFile, decryptFile, keyToBase64, base64ToKey } from '../scripts/crypto';

describe('crypto', () => {
  it('generates 32-byte key', () => {
    const key = generateKey();
    expect(key.length).toBe(32);
  });

  it('encrypts and decrypts file round-trip', async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 0]);
    const key = generateKey();
    const encrypted = await encryptFile(data, key);
    const decrypted = await decryptFile(encrypted, key);
    expect(decrypted).toEqual(data);
  });

  it('base64 round-trip for key', () => {
    const key = generateKey();
    const b64 = keyToBase64(key);
    const recovered = base64ToKey(b64);
    expect(recovered).toEqual(key);
  });

  it('different ciphertext for same data', async () => {
    const data = new Uint8Array([42]);
    const key = generateKey();
    const encrypted1 = await encryptFile(data, key);
    const encrypted2 = await encryptFile(data, key);
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
    expect(encrypted1.iv).not.toEqual(encrypted2.iv);
  });
});
