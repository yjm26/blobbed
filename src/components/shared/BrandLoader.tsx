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
      className={[
        'brand-loader',
        overlay ? 'brand-loader--overlay' : '',
        variant === 'enter' ? 'brand-loader--enter' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="brand-loader-ambient" aria-hidden="true" />
      <div className="brand-loader-inner">
        <AegisLogo variant="horizontal" className="brand-loader-word" />
        <div className="brand-loader-mark" aria-hidden="true">
          <AegisLogo variant="icon" className="brand-loader-icon" alt="" />
        </div>
        <div className="brand-loader-copy">
          <p className="brand-loader-label">{label}</p>
          {hint ? <p className="brand-loader-hint">{hint}</p> : null}
        </div>
        <div className="brand-loader-bar" aria-hidden="true">
          <span className="brand-loader-bar-fill" />
        </div>
      </div>
    </div>
  );
}
