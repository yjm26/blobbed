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
 * Top bar — brand left, wallet profile + logout right (legacy look).
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
    <header className="app-top app-reveal app-reveal-1">
      <Link to="/" className="app-brand" aria-label="Aegis home">
        <AegisLogo variant="horizontal" />
      </Link>
      <div className="app-top-right">
        {showVaultChip ? (
          <button
            type="button"
            className={`vault-chip ${vaultOk ? 'is-ok' : 'is-warn'}`}
            title={
              vaultOk
                ? 'File keys wrapped with wallet-derived key'
                : 'Sign with wallet to unlock wrapped keys'
            }
            onClick={onUnlockVault}
          >
            {vaultOk ? 'Keys wrapped' : 'Unlock keys'}
          </button>
        ) : null}
        <span className="wallet-chip" title={address}>
          {chip}
        </span>
        <button
          type="button"
          className="app-link app-link-muted"
          onClick={onDisconnect}
        >
          Disconnect
        </button>
      </div>
    </header>
  );
}
