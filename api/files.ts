import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Legacy files API — disabled (mutations + unauth reads leaked encryptedKey).
 * Use authenticated POST /api/library.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (
    req.method === 'GET' ||
    req.method === 'POST' ||
    req.method === 'PUT' ||
    req.method === 'PATCH' ||
    req.method === 'DELETE'
  ) {
    return res.status(410).json({
      error: 'Legacy files API disabled',
      code: 'USE_LIBRARY_API',
      hint: 'Use authenticated POST /api/library (session or owner auth).',
    });
  }

  return res.status(405).json({ error: 'Method not allowed', code: 'METHOD' });
}
