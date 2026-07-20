import React, { useEffect, useState } from 'react';

export type MediaLightboxKind = 'image' | 'video';

export type MediaLightboxState = {
  url: string;
  name: string;
  kind: MediaLightboxKind;
  loading?: boolean;
  error?: string;
  /** 0..1 while loading */
  progress?: number;
  progressLabel?: string;
  /** album index when browsing multiple */
  index?: number;
  total?: number;
};

type Props = {
  state: MediaLightboxState | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

const toolButton =
  'h-8 min-w-8 rounded-lg border border-white/[0.12] bg-black/35 px-2 text-[0.75rem] text-[#ddd] transition-colors duration-150 hover:border-white/30 hover:text-white motion-reduce:transition-none';
const navButton =
  'absolute top-1/2 z-[5] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/[0.14] bg-black/45 text-[1.4rem] leading-none text-white transition-colors duration-150 hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-35 max-[720px]:h-8 max-[720px]:w-8';

/**
 * In-app media preview. image zoom + album keyboard nav.
 */
export default function MediaLightbox({ state, onClose, onPrev, onNext }: Props) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [state?.url, state?.name]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (state.loading || state.error) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev?.();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext?.();
      } else if (e.key === '+' || e.key === '=') {
        if (state.kind === 'image') {
          e.preventDefault();
          setZoom((z) => Math.min(4, z + 0.25));
        }
      } else if (e.key === '-' || e.key === '_') {
        if (state.kind === 'image') {
          e.preventDefault();
          setZoom((z) => Math.max(1, z - 0.25));
        }
      } else if (e.key === '0') {
        if (state.kind === 'image') {
          e.preventDefault();
          setZoom(1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [state, onClose, onPrev, onNext]);

  if (!state) return null;

  const pct = Math.round(Math.min(1, Math.max(0, state.progress ?? 0)) * 100);
  const hasAlbum =
    typeof state.index === 'number' &&
    typeof state.total === 'number' &&
    state.total > 1;

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-black/[0.94] p-[env(safe-area-inset-top,0)_env(safe-area-inset-right,0)_env(safe-area-inset-bottom,0)_env(safe-area-inset-left,0)] backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={state.loading ? 'Loading preview' : `Preview ${state.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <p className="m-0 min-w-0 truncate text-[0.8125rem] font-normal text-white/70" title={state.name}>
          {state.name}
          {hasAlbum ? (
            <span className="font-normal opacity-55">
              {' '}
              · {(state.index ?? 0) + 1}/{state.total}
            </span>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {state.kind === 'image' && !state.loading && !state.error ? (
            <>
              <button
                type="button"
                className={toolButton}
                onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className={toolButton}
                onClick={() => setZoom(1)}
                aria-label="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className={toolButton}
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                aria-label="Zoom in"
              >
                +
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="shrink-0 border border-white/[0.14] bg-transparent px-3 py-2 text-[0.6875rem] uppercase tracking-[0.1em] text-white/80 transition-colors duration-150 hover:border-white/35 hover:text-white motion-reduce:transition-none"
            aria-label="Close preview"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      {hasAlbum && !state.loading ? (
        <>
          <button
            type="button"
            className={`${navButton} left-3`}
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              onPrev?.();
            }}
            disabled={!onPrev}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${navButton} right-3`}
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              onNext?.();
            }}
            disabled={!onNext}
          >
            ›
          </button>
        </>
      ) : null}

      <div
        className={`grid min-h-0 flex-1 place-items-center p-5 ${zoom > 1 ? 'overflow-auto cursor-zoom-out' : ''}`}
        onClick={(e) => {
          if (state.kind === 'image' && !state.loading && e.target === e.currentTarget) {
            setZoom((z) => (z > 1 ? 1 : 1.75));
          }
        }}
      >
        {state.loading ? (
          <div className="flex max-w-72 flex-col items-center gap-3 text-center text-sm text-white/70">
            <span className="mb-1 h-7 w-7 animate-spin rounded-full border border-white/[0.12] border-t-white/75" aria-hidden="true" />
            <p className="m-0">{state.progressLabel || 'Decrypting in your browser…'}</p>
            <div className="mt-1 h-0.5 w-[min(16rem,70vw)] overflow-hidden rounded-full bg-white/[0.08]" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-white/55 transition-[width] duration-200"
                style={{ width: `${Math.max(6, pct)}%` }}
              />
            </div>
            <p className="m-0 text-xs leading-[1.4] text-white/40">
              {state.kind === 'video' ? `Chunked download · ${pct}%` : `${pct}%`}
            </p>
          </div>
        ) : state.error ? (
          <div className="flex max-w-72 flex-col items-center gap-3 text-center text-sm text-[#e8a0a0]">
            <p className="m-0">Preview failed</p>
            <p className="m-0 text-xs leading-[1.4] text-white/40">{state.error}</p>
          </div>
        ) : state.kind === 'image' ? (
          <img
            className="max-h-[min(78vh,900px)] max-w-[min(92vw,1100px)] rounded-[2px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-transform duration-150"
            src={state.url}
            alt={state.name}
            draggable={false}
            style={{ transform: `scale(${zoom})` }}
            onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
          />
        ) : (
          <video
            className="max-h-[min(78vh,900px)] w-[min(96vw,1100px)] rounded-[2px] bg-black object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            src={state.url}
            controls
            autoPlay
            playsInline
            preload="auto"
          />
        )}
      </div>

      {hasAlbum || state.kind === 'image' ? (
        <p className="pointer-events-none absolute bottom-3 left-1/2 m-0 -translate-x-1/2 text-[0.68rem] tracking-[0.02em] text-white/40">
          {hasAlbum ? '← → navigate · ' : ''}
          {state.kind === 'image' ? '+/− zoom · 0 reset · ' : ''}
          Esc close
        </p>
      ) : null}
    </div>
  );
}
