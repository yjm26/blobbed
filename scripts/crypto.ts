export interface EncryptedBlob {
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

export function generateKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function encryptFile(
  data: Uint8Array,
  key: Uint8Array
): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data as any
  );
  return {
    ciphertext: new Uint8Array(encrypted),
    iv,
  };
}

export async function decryptFile(
  encrypted: EncryptedBlob,
  key: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: encrypted.iv },
    cryptoKey,
    encrypted.ciphertext
  );
  return new Uint8Array(decrypted);
}

export function keyToBase64(key: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < key.length; i++) {
    binary += String.fromCharCode(key[i]);
  }
  return btoa(binary);
}

export function base64ToKey(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
