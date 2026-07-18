import React, { useEffect } from 'react';

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
};

type Props = {
  state: MediaLightboxState | null;
  onClose: () => void;
};

/**
 * In-app media preview — image or video.
 * Phase B: chunked download/decrypt with progress; full assemble then play.
 */
export default function MediaLightbox({ state, onClose }: Props) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [state, onClose]);

  if (!state) return null;

  const pct = Math.round(Math.min(1, Math.max(0, state.progress ?? 0)) * 100);

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
        </p>
        <button
          type="button"
          className="media-lightbox-close"
          aria-label="Close preview"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="media-lightbox-stage">
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
              {state.kind === 'video'
                ? `Chunked download · ${pct}%`
                : `${pct}%`}
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
    </div>
  );
}
