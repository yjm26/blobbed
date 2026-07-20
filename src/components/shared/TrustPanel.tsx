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

const panelBase =
  'text-left text-[0.78rem] leading-[1.45] text-[rgba(220,220,230,0.72)]';
const boxedPanel =
  'rounded-xl border border-white/[0.08] bg-[rgba(12,12,16,0.55)] px-4 py-3.5';
const leadClass =
  'm-0 mb-2 text-[0.68rem] uppercase tracking-[0.12em] text-[rgba(200,190,170,0.7)]';
const listClass =
  'm-0 list-disc space-y-1.5 pl-[1.05rem] marker:text-[rgba(200,190,170,0.45)] [&_code]:text-[0.85em] [&_code]:text-[#c8b8a0]';
const unlockButton =
  'mt-3 rounded-none border border-[var(--border)] bg-transparent px-4 py-3 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text)] transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.04] motion-reduce:transition-none';

/**
 * Honest trust copy - what the server sees vs what stays client-side.
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
      <div className={`${panelBase} ${boxedPanel} mx-auto mt-6 max-w-[22.5rem] ${className}`.trim()}>
        <p className={leadClass}>Before you connect</p>
        <ul className={listClass}>
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
            <strong>Vault key</strong> stays in RAM only - refresh = sign again.
            Thumbs sealed as <code>bt1.</code>; plain previews stripped server-side.
          </li>
        </ul>
      </div>
    );
  }

  if (context === 'share') {
    return (
      <div className={`${panelBase} mx-auto mt-1.5 w-full max-w-[70rem] px-5 py-2 ${className}`.trim()}>
        <p className="m-0 text-[0.72rem] tracking-[0.01em] text-[rgba(200,195,185,0.55)]">
          Capability link · decrypts only in this browser · key lives in the
          URL fragment · we do not store this share key · lose the link = lose
          access
        </p>
      </div>
    );
  }

  if (context === 'landing') {
    return (
      <div className={`${panelBase} max-w-[40rem] ${className}`.trim()}>
        <p className={leadClass}>Threat model (MVP, honest)</p>
        <ul className={listClass}>
          <li>
            Browser encrypts with AES-256-GCM before upload. Shelby stores
            ciphertext.
          </li>
          <li>
            Your library index (names, blob ids, <em>wrapped</em> keys) may live
            on Neon so devices can sync. Raw DEKs are wallet-wrapped client-side.
          </li>
          <li>
            Anyone with a share link can decrypt that file - by design. No
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
  const syncTarget =
    backend === 'neon'
      ? 'Neon'
    : backend === 'memory'
        ? 'temporary server memory'
        : backend === 'local'
          ? 'this device'
          : 'checking…';
  const protectedKeyCopy = keyStats
    ? ` · ${keyStats.wrapped} protected key${keyStats.wrapped === 1 ? '' : 's'}${
        keyStats.plain ? ` · ${keyStats.plain} legacy item${keyStats.plain === 1 ? '' : 's'}` : ''
      }${
        keyStats.plainThumbs
          ? ` · ${keyStats.plainThumbs} unsealed thumb${keyStats.plainThumbs === 1 ? '' : 's'}`
          : ''
      }`
    : '';

  if (compact) {
    return (
      <div className={`mx-auto flex w-full max-w-[70rem] flex-wrap items-center gap-2 px-5 pb-1 pt-2 text-[0.72rem] tracking-[0.02em] text-[rgba(220,220,230,0.55)] ${className}`.trim()}>
        <span
          className={`h-[7px] w-[7px] shrink-0 rounded-full ${
            vaultOk
              ? 'bg-[#6a9a72] shadow-[0_0_8px_rgba(80,160,100,0.4)]'
              : 'bg-[#c4a060] shadow-[0_0_8px_rgba(180,120,40,0.35)]'
          }`}
        />
        <span>
          {vaultOk ? 'Private vault unlocked' : 'Private vault locked'}
          {protectedKeyCopy}
          {` · Library synced: ${syncTarget}`}
        </span>
        {!vaultOk && onUnlock ? (
          <button
            type="button"
            className="ml-1 rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-[0.68rem] text-[#d8d0c4] transition-colors duration-150 hover:border-white/30 hover:text-white motion-reduce:transition-none"
            onClick={onUnlock}
          >
            Unlock
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`${panelBase} ${boxedPanel} mx-auto mt-2 w-full max-w-[70rem] px-5 ${className}`.trim()}>
      <p className={leadClass}>Security details</p>
      <ul className={listClass}>
        <li>
          <strong>Files encrypt on this device before upload.</strong> The API can see wallet address, file names, sizes, blob
          pointers, wrapped key blobs, optional thumbs you generate.
        </li>
        <li>
          <strong>File contents stay private:</strong> plaintext files and raw file keys stay out of the API when keys are protected by your wallet-derived vault key.
        </li>
        <li>
          <strong>Share default:</strong> lose the link → lose access. No server
          “Shared with you” inbox.
        </li>
        <li>
          Status: {vaultOk ? 'private vault open' : 'private vault locked'} · library synced: {syncTarget}
          {keyStats
            ? ` · ${keyStats.wrapped} protected key${keyStats.wrapped === 1 ? '' : 's'}${keyStats.plain ? `, ${keyStats.plain} legacy plain item${keyStats.plain === 1 ? '' : 's'}` : ''}`
            : ''}
        </li>
      </ul>
      {!vaultOk && onUnlock ? (
        <button type="button" className={unlockButton} onClick={onUnlock}>
          Sign to unlock encryption
        </button>
      ) : null}
    </div>
  );
}
