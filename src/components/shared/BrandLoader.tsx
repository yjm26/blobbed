import AegisLogo from './AegisLogo';

type Props = {
  /** Primary line */
  label?: string;
  /** Secondary quiet line */
  hint?: string;
  /** Full-screen fixed overlay (connect → drive) */
  overlay?: boolean;
  /** Gate success handoff */
  variant?: 'default' | 'enter';
};

const loaderShell = 'inset-0 z-[80] grid min-h-[100svh] min-h-[100dvh] place-items-center overflow-hidden bg-[#050505] px-6 text-[#f5f5f5]';
const ambientLayer = 'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.08),transparent_24rem),radial-gradient(circle_at_20%_20%,rgba(90,90,110,0.18),transparent_28rem),#050505]';
const innerPanel = 'relative z-[1] flex w-full max-w-[22rem] flex-col items-center gap-4 text-center';
const iconClass = '!w-[clamp(4.25rem,11vw,5.75rem)] opacity-95 drop-shadow-[0_18px_42px_rgba(255,255,255,0.08)]';

/**
 * Full-viewport brand loader. route chunks, drive hydrate, gate handoff.
 * Always covers the screen (no parent-column “strip”).
 */
export default function BrandLoader({
  label = 'Loading',
  hint,
  overlay = false,
  variant = 'default',
}: Props) {
  return (
    <div
      className={`${overlay ? 'fixed' : 'fixed'} ${loaderShell}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={ambientLayer} aria-hidden="true" />
      <div className={`${innerPanel} ${variant === 'enter' ? 'scale-100' : ''}`}>
        <div className="grid h-[clamp(5.5rem,14vw,7rem)] w-[clamp(5.5rem,14vw,7rem)] place-items-center rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_68%)]">
          <AegisLogo variant="icon" className={iconClass} alt="" />
        </div>
        <div className="grid gap-1.5">
          <p className="m-0 text-[0.72rem] font-normal uppercase tracking-[0.16em] text-white/72">{label}</p>
          {hint ? <p className="m-0 text-[0.76rem] leading-[1.55] text-white/38">{hint}</p> : null}
        </div>
        <div className="relative mt-1 h-px w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
