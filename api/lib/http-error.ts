/**
 * Safe public error payloads — log full server-side, never leak stacks.
 */
export function publicError(
  err: unknown,
  fallback = 'Internal error'
): { error: string; code: string } {
  console.error(err);
  if (err instanceof Error) {
    const safeSnippets = [
      'Missing ownerAddress',
      'Missing op',
      'Missing owner',
      'LIBRARY_SESSION_SECRET required',
      'Method not allowed',
      'Unknown op',
    ];
    if (safeSnippets.some((s) => err.message.includes(s))) {
      return { error: err.message, code: 'BAD_REQUEST' };
    }
  }
  return { error: fallback, code: 'INTERNAL' };
}
