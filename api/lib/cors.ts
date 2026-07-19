/**
 * CORS allowlist helpers (server-only).
 */

export function parseCorsAllowlist(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.BLOBED_ENV === 'production'
  ) {
    // Strict: only same-host reflect via resolveAllowedOrigin(reqHost)
    return [];
  }
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
}

/**
 * Returns the Origin to echo, or null if request should not get ACAO.
 * - allowlist hit
 * - OR same-host as reqHost (e.g. https://blobbed.onrender.com when Host matches)
 */
export function resolveAllowedOrigin(
  reqOrigin: string | undefined,
  allowlist: string[],
  reqHost?: string
): string | null {
  if (!reqOrigin) return null;
  const o = reqOrigin.trim().replace(/\/$/, '');
  if (!o) return null;
  const normalized = allowlist.map((x) => x.trim().replace(/\/$/, '')).filter(Boolean);
  if (normalized.includes(o)) return o;
  if (reqHost) {
    try {
      const u = new URL(o);
      if (u.host === reqHost) return o;
    } catch {
      /* ignore */
    }
  }
  return null;
}
