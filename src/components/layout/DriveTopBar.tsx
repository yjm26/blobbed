import React from 'react';
import { Link } from 'react-router-dom';
import AegisLogo from '../shared/AegisLogo';

export type DriveTopBarProps = {
  address: string;
  vaultOk: boolean;
  onUnlockVault: () => void;
  onDisconnect: () => void;
  /** Optional: show vault chip (default true) */
  showVaultChip?: boolean;
};

/**
 * Top bar — brand left, wallet profile + logout right.
 */
export default function DriveTopBar({
  address,
  vaultOk,
  onUnlockVault,
  onDisconnect,
  showVaultChip = true,
}: DriveTopBarProps) {
  const chip =
    address.length > 10
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : address;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[rgba(7,7,7,0.92)] px-4 py-3.5 text-[var(--text)] backdrop-blur-md sm:px-6 lg:px-8 max-[480px]:items-start">
      <Link to="/" className="inline-flex shrink-0 items-center leading-none text-[var(--text)] no-underline" aria-label="Aegis home">
        <AegisLogo variant="horizontal" className="!w-[clamp(5.35rem,7vw,6.8rem)] max-[480px]:!w-[5.35rem]" />
      </Link>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 max-[480px]:gap-x-2">
        {showVaultChip ? (
          <button
            type="button"
            className={`max-w-[9.5rem] overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.68rem] tracking-[0.02em] transition-colors duration-150 hover:border-white/30 ${
              vaultOk
                ? 'border-[rgba(100,160,110,0.35)] bg-white/[0.04] text-[#b8d4b8]'
                : 'border-[rgba(200,150,60,0.4)] bg-white/[0.04] text-[#e0c090]'
            }`}
            title={
              vaultOk
                ? 'Files encrypt on this device before upload. Your file keys are protected by a wallet-derived vault key.'
                : 'Sign with your wallet to unlock encryption for previews, sharing, and library sync.'
            }
            onClick={onUnlockVault}
          >
            {vaultOk ? 'Encryption active' : 'Unlock encryption'}
          </button>
        ) : null}
        <span className="max-w-44 overflow-hidden text-ellipsis whitespace-nowrap border border-[var(--border)] px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.04em] text-[var(--text-3)] max-[480px]:max-w-[7.5rem]" title={address}>
          {chip}
        </span>
        <button
          type="button"
          className="border-0 bg-transparent p-0 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text-3)] transition-opacity duration-150 hover:opacity-55 motion-reduce:transition-none max-[480px]:w-full max-[480px]:text-right"
          onClick={onDisconnect}
        >
          Disconnect
        </button>
      </div>
    </header>
  );
}
