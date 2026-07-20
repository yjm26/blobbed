import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPublicFolderShare } from '../lib/db.js';
import { publicError } from '../lib/http-error.js';
import { rateLimit } from '../lib/owner-auth.js';

function shareIdFromReq(req: VercelRequest): string {
  const q = req.query?.id;
  if (Array.isArray(q)) return String(q[0] || '');
  if (q) return String(q);
  const url = req.url || '';
  const m = url.match(/\/api\/share\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }
  const shareId = shareIdFromReq(req);
  if (!shareId) return res.status(400).json({ error: 'Missing shareId', code: 'BAD_REQUEST' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
  const rl = rateLimit(`public-share:${ip}`, 120, 60_000);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({ error: 'Too many share requests', code: 'RATE_LIMIT' });
  }

  try {
    const result = await getPublicFolderShare(shareId);
    if (result.status === 'not_found') return res.status(404).json({ error: 'Share not found', code: 'NOT_FOUND' });
    if (result.status === 'revoked') return res.status(410).json({ error: 'Share revoked or folder gone', code: 'SHARE_REVOKED' });
    if (result.status !== 'active') return res.status(500).json({ error: 'Invalid share state', code: 'BAD_STATE' });
    const active = result as Extract<typeof result, { status: 'active' }>;
    return res.status(200).json(active.share);
  } catch (err) {
    return res.status(500).json(publicError(err, 'Share API error'));
  }
}
