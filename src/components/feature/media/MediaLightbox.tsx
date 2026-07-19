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
      className="media-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={state.loading ? 'Loading preview' : `Preview ${state.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="media-lightbox-chrome">
        <p className="media-lightbox-name" title={state.name}>
          {state.name}
          {hasAlbum ? (
            <span className="media-lightbox-idx">
              {' '}
              · {(state.index ?? 0) + 1}/{state.total}
            </span>
          ) : null}
        </p>
        <div className="media-lightbox-chrome-actions">
          {state.kind === 'image' && !state.loading && !state.error ? (
            <>
              <button
                type="button"
                className="media-lightbox-tool"
                onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className="media-lightbox-tool"
                onClick={() => setZoom(1)}
                aria-label="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className="media-lightbox-tool"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                aria-label="Zoom in"
              >
                +
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="media-lightbox-close"
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
            className="media-lightbox-nav media-lightbox-nav--prev"
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
            className="media-lightbox-nav media-lightbox-nav--next"
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
        className={`media-lightbox-stage ${zoom > 1 ? 'is-zoomed' : ''}`}
        onClick={(e) => {
          if (state.kind === 'image' && !state.loading && e.target === e.currentTarget) {
            setZoom((z) => (z > 1 ? 1 : 1.75));
          }
        }}
      >
        {state.loading ? (
          <div className="media-lightbox-status">
            <span className="media-lightbox-spinner" aria-hidden="true" />
            <p>{state.progressLabel || 'Decrypting in your browser…'}</p>
            <div className="media-lightbox-progress" aria-hidden="true">
              <span
                className="media-lightbox-progress-fill"
                style={{ width: `${Math.max(6, pct)}%` }}
              />
            </div>
            <p className="media-lightbox-status-hint">
              {state.kind === 'video' ? `Chunked download · ${pct}%` : `${pct}%`}
            </p>
          </div>
        ) : state.error ? (
          <div className="media-lightbox-status media-lightbox-status--err">
            <p>Preview failed</p>
            <p className="media-lightbox-status-hint">{state.error}</p>
          </div>
        ) : state.kind === 'image' ? (
          <img
            className="media-lightbox-media"
            src={state.url}
            alt={state.name}
            draggable={false}
            style={{ transform: `scale(${zoom})` }}
            onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
          />
        ) : (
          <video
            className="media-lightbox-media media-lightbox-video"
            src={state.url}
            controls
            autoPlay
            playsInline
            preload="auto"
          />
        )}
      </div>

      {hasAlbum || state.kind === 'image' ? (
        <p className="media-lightbox-hint">
          {hasAlbum ? '← → navigate · ' : ''}
          {state.kind === 'image' ? '+/− zoom · 0 reset · ' : ''}
          Esc close
        </p>
      ) : null}
    </div>
  );
}
