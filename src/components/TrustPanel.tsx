import React from 'react';

export type TrustContext = 'gate' | 'drive' | 'share' | 'landing';

type Props = {
  context: TrustContext;
  compact?: boolean;
  vaultOk?: boolean;
  backend?: 'neon' | 'memory' | 'local' | 'unknown';
  keyStats?: {
    plain: number;
    wrapped: number;
    plainThumbs?: number;
    wrappedThumbs?: number;
  };
  onUnlock?: () => void;
  className?: string;
};

/**
 * Honest trust copy — what the server sees vs what stays client-side.
 * Prefer understatement over MEGA marketing claims.
 */
export default function TrustPanel({
  context,
  compact,
  vaultOk,
  backend,
  keyStats,
  onUnlock,
  className = '',
}: Props) {
  if (context === 'gate') {
    return (
      <div className={`trust-panel trust-panel--gate ${className}`.trim()}>
        <p className="trust-lead">Before you connect</p>
        <ul className="trust-list">
          <li>
            <strong>Ciphertext only</strong> goes to Shelby. Encrypt happens in
            your browser.
          </li>
          <li>
            <strong>File keys</strong> are wrapped with a key from your wallet
            signature, then stored in library meta (Neon if configured).
          </li>
          <li>
            <strong>Share links</strong> put the raw key in the URL{' '}
            <code>#fragment</code>. Server logs never see it. Lose the link →
            lose access.
          </li>
          <li>
            <strong>Upload</strong> needs your wallet signature (owner auth) so
            strangers cannot burn the service wallet. Gas is still sponsored on
            shelbynet for now.
          </li>
          <li>
            <strong>Vault key</strong> stays in RAM only — refresh = sign again.
            Thumbs sealed as <code>bt1.</code>; plain previews stripped server-side.
          </li>
        </ul>
      </div>
    );
  }

  if (context === 'share') {
    return (
      <div className={`trust-panel trust-panel--share ${className}`.trim()}>
        <p className="trust-banner">
          Capability link · decrypts only in this browser · key lives in the
          URL fragment · we do not store this share key · lose the link = lose
          access
        </p>
      </div>
    );
  }

  if (context === 'landing') {
    return (
      <div className={`trust-panel trust-panel--landing ${className}`.trim()}>
        <p className="trust-lead">Threat model (MVP, honest)</p>
        <ul className="trust-list">
          <li>
            Browser encrypts with AES-256-GCM before upload. Shelby stores
            ciphertext.
          </li>
          <li>
            Your library index (names, blob ids, <em>wrapped</em> keys) may live
            on Neon so devices can sync. Raw DEKs are wallet-wrapped client-side.
          </li>
          <li>
            Anyone with a share link can decrypt that file — by design. No
            password reset, no recovery email.
          </li>
          <li>
            Not a formal audit. Service wallet relays paid uploads on shelbynet.
          </li>
        </ul>
      </div>
    );
  }

  // drive
  const be =
    backend === 'neon'
      ? 'Neon durable'
      : backend === 'memory'
        ? 'server memory'
        : backend === 'local'
          ? 'this device only'
          : '…';

  if (compact) {
    return (
      <div className={`trust-strip ${className}`.trim()}>
        <span className={`trust-dot ${vaultOk ? 'is-ok' : 'is-warn'}`} />
        <span>
          {vaultOk ? 'Vault unlocked' : 'Vault locked'}
          {keyStats
            ? ` · ${keyStats.wrapped} wrapped${keyStats.plain ? ` · ${keyStats.plain} legacy` : ''}${
                keyStats.plainThumbs
                  ? ` · ${keyStats.plainThumbs} plain thumbs`
                  : ''
              }`
            : ''}
          {` · meta: ${be}`}
        </span>
        {!vaultOk && onUnlock ? (
          <button type="button" className="trust-action" onClick={onUnlock}>
            Unlock
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`trust-panel trust-panel--drive ${className}`.trim()}>
      <p className="trust-lead">What we can and cannot see</p>
      <ul className="trust-list">
        <li>
          <strong>Can see:</strong> wallet address, file names, sizes, blob
          pointers, wrapped key blobs, optional thumbs you generate.
        </li>
        <li>
          <strong>Cannot see:</strong> plaintext files; raw DEKs when
          wallet-wrapped; share-link keys (fragment never sent to our API).
        </li>
        <li>
          <strong>Share default:</strong> lose the link → lose access. No server
          “Shared with you” inbox.
        </li>
        <li>
          Status: vault {vaultOk ? 'unlocked' : 'locked'} · library {be}
          {keyStats
            ? ` · ${keyStats.wrapped} keys wrapped${keyStats.plain ? `, ${keyStats.plain} legacy plain` : ''}`
            : ''}
        </li>
      </ul>
      {!vaultOk && onUnlock ? (
        <button type="button" className="app-btn-ghost" onClick={onUnlock}>
          Sign to unlock keys
        </button>
      ) : null}
    </div>
  );
}
