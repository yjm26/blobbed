import React from 'react';

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
 * Full-screen boot progress (BrandLoader skin + 3 clear steps).
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

  return (
    <div
      className="brand-loader brand-loader--boot"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="brand-loader-ambient" aria-hidden="true" />
      <div className="brand-loader-inner">
        <p className="brand-loader-word">Blobbed</p>
        <div className="brand-loader-mark" aria-hidden="true">
          <span className="brand-loader-ring" />
          <span className="brand-loader-core">B</span>
        </div>
        <div className="brand-loader-copy">
          <p className="brand-loader-label">Opening your library</p>
          <p className="brand-loader-hint">
            {detail ||
              'Two wallet signatures this tab — vault key stays in memory only'}
          </p>
        </div>

        <ol className="boot-steps" aria-label="Setup progress">
          {STEPS.map((s, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <li
                key={s.id}
                className={[
                  'boot-step',
                  done ? 'is-done' : '',
                  active ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="boot-step-mark" aria-hidden="true">
                  {done ? '✓' : i + 1}
                </span>
                <span className="boot-step-label">{s.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="brand-loader-bar" aria-hidden="true">
          <span className="brand-loader-bar-fill" />
        </div>
      </div>
    </div>
  );
}
