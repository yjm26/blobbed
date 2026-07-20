import React from 'react';
import AegisLogo from '../../shared/AegisLogo';

export type DriveBootErrorProps = {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
  onDisconnect: () => void;
};

/** Brand-matched full-screen error (Retry / Disconnect). */
export default function DriveBootError({
  message,
  isRetrying,
  onRetry,
  onDisconnect,
}: DriveBootErrorProps) {
  return (
    <div className="brand-loader brand-loader--error" role="alert">
      <div className="brand-loader-ambient" aria-hidden="true" />
      <div className="brand-loader-inner">
        <div className="brand-loader-mark brand-loader-mark--logo" aria-hidden="true">
          <AegisLogo variant="icon" className="brand-loader-icon" alt="" />
        </div>
        <div className="brand-loader-copy">
          <p className="brand-loader-label">Couldn&apos;t open library</p>
          <p className="brand-loader-hint">{message}</p>
        </div>
        <div className="brand-loader-actions">
          <button
            type="button"
            className="app-modal-btn app-modal-btn-primary"
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
          <button
            type="button"
            className="app-modal-btn app-modal-btn-ghost"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
