import React from 'react';
import AegisLogo from '../../shared/AegisLogo';

export type BootStepId = 'vault' | 'session' | 'library';

const STEPS: { id: BootStepId; label: string }[] = [
  { id: 'vault', label: 'Unlock vault' },
  { id: 'session', label: 'Library session' },
  { id: 'library', label: 'Load library' },
];

export type DriveBootProgressProps = {
  activeId: BootStepId;
  detail?: string;
};

/**
 * Full-screen boot progress using the real Aegis icon and a quiet bar.
 * Two Petra signs: vault + session, then hydrate.
 */
export default function DriveBootProgress({
  activeId,
  detail,
}: DriveBootProgressProps) {
  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.id === activeId)
  );
  const activeStep = STEPS[activeIdx] || STEPS[0];
  const progress = `${((activeIdx + 1) / STEPS.length) * 100}%`;

  return (
    <div
      className="brand-loader brand-loader--boot"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="brand-loader-ambient" aria-hidden="true" />
      <div
        className="brand-loader-inner"
        style={{ '--boot-progress': progress } as React.CSSProperties}
      >
        <div className="brand-loader-mark brand-loader-mark--logo" aria-hidden="true">
          <AegisLogo variant="icon" className="brand-loader-icon" alt="" />
        </div>

        <div className="brand-loader-boot-bar" aria-hidden="true">
          <span className="brand-loader-boot-bar-fill" />
        </div>

        <p className="sr-only">{activeStep.label}</p>

        <div className="brand-loader-copy">
          <p className="brand-loader-label">Opening your library</p>
          <p className="brand-loader-hint">
            {detail ||
              'Two wallet signatures this tab — vault key stays in memory only'}
          </p>
        </div>
      </div>
    </div>
  );
}
