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
      className="fixed inset-0 z-[80] grid min-h-[100svh] min-h-[100dvh] place-items-center overflow-hidden bg-[#050505] px-6 text-[#f5f5f5]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.08),transparent_24rem),radial-gradient(circle_at_20%_20%,rgba(90,90,110,0.18),transparent_28rem),#050505]" aria-hidden="true" />
      <div className="relative z-[1] flex w-full max-w-[22rem] flex-col items-center gap-4 text-center">
        <div className="grid h-[clamp(5.5rem,14vw,7rem)] w-[clamp(5.5rem,14vw,7rem)] place-items-center rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_68%)]">
          <AegisLogo variant="icon" className="!w-[clamp(4.25rem,11vw,5.75rem)] opacity-95 drop-shadow-[0_18px_42px_rgba(255,255,255,0.08)]" alt="" />
        </div>

        <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <span
            className="absolute inset-y-0 left-0 min-w-[24%] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.2),rgba(255,255,255,0.72),rgba(255,255,255,0.36))] shadow-[0_0_18px_rgba(255,255,255,0.12)] transition-[width] duration-300"
            style={{ width: progress } as React.CSSProperties}
          />
        </div>

        <p className="sr-only">{activeStep.label}</p>

        <div className="grid gap-1.5">
          <p className="m-0 text-[0.72rem] font-normal uppercase tracking-[0.16em] text-white/72">Opening your library</p>
          <p className="m-0 text-[0.76rem] leading-[1.55] text-white/38">
            {detail ||
              'Two wallet signatures this tab — vault key stays in memory only'}
          </p>
        </div>
      </div>
    </div>
  );
}
