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
    <div className="fixed inset-0 z-[80] grid min-h-[100svh] min-h-[100dvh] place-items-center overflow-hidden bg-[#050505] px-6 text-[#f5f5f5]" role="alert">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.08),transparent_24rem),radial-gradient(circle_at_20%_20%,rgba(90,90,110,0.18),transparent_28rem),#050505]" aria-hidden="true" />
      <div className="relative z-[1] flex w-full max-w-[22rem] flex-col items-center gap-4 text-center">
        <div className="grid h-[clamp(5.5rem,14vw,7rem)] w-[clamp(5.5rem,14vw,7rem)] place-items-center rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_68%)]">
          <AegisLogo variant="icon" className="!w-[clamp(4.25rem,11vw,5.75rem)] opacity-95 drop-shadow-[0_18px_42px_rgba(255,255,255,0.08)]" alt="" />
        </div>
        <div className="grid gap-1.5">
          <p className="m-0 text-[0.72rem] font-normal uppercase tracking-[0.16em] text-white/72">Couldn&apos;t open library</p>
          <p className="m-0 text-[0.76rem] leading-[1.55] text-white/38">{message}</p>
        </div>
        <div className="mt-2 flex w-full flex-col items-stretch gap-2">
          <button
            type="button"
            className="w-full bg-[#f5f5f5] px-4 py-3 text-xs font-normal uppercase tracking-[0.14em] text-[#050505] transition duration-150 hover:opacity-90 disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none"
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
          <button
            type="button"
            className="w-full border border-white/12 bg-white/[0.03] px-4 py-3 text-xs font-normal uppercase tracking-[0.14em] text-white/72 transition duration-150 hover:border-white/24 hover:text-white motion-reduce:transition-none"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
