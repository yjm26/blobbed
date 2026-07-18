import type { VercelRequest, VercelResponse } from 'vercel';

// MVP: backend relay — encrypted blob diterima, nanti submit ke Shelby Protocol
// Butuh APTOS_PRIVATE_KEY env untuk real submit.
// Sekarang: store metadata, return mock hash untuk demo flow.

const mockHashes: Record<string, string> = {};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { encryptedBase64, fileName, ownerAddress, fileSize } = req.body;
    if (!encryptedBase64 || !fileName || !ownerAddress) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const blobData = new Uint8Array(Buffer.from(encryptedBase64, 'base64'));
    if (blobData.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Max file size 5MB for MVP' });
    }

    // TODO: real Shelby upload with ShelbyClient
    // const shelby = new ShelbyClient({ network: Network.TESTNET });
    // const tx = await shelby.upload({ blobData, signer: backendAccount, blobName: fileName, expirationMicros: ... });

    const mockHash = '0x' + Array.from({ length: 64 }, () =>
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');

    mockHashes[mockHash] = fileName;

    return res.status(200).json({
      success: true,
      blobHash: mockHash,
      fileName,
      ownerAddress,
      fileSize,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
