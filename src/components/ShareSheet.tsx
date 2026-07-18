import React, { useEffect, useRef, useState } from 'react';

export type ShareSheetState = {
  title: string;
  subtitle?: string;
  link: string;
  kind: 'file' | 'folder';
  fileCount?: number;
};

type Props = {
  state: ShareSheetState | null;
  onClose: () => void;
};

export default function ShareSheet({ state, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state) return;
    setCopied(false);
    setErr('');
    const t = window.setTimeout(() => inputRef.current?.select(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [state, onClose]);

  if (!state) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(state!.link);
      setCopied(true);
      setErr('');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr('Clipboard blocked — select the link and copy manually');
      inputRef.current?.select();
    }
  }

  return (
    <div
      className="app-modal-backdrop share-sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="app-modal share-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-sheet-title" className="app-modal-title">
          Share {state.kind === 'folder' ? 'folder' : 'file'}
        </h2>
        <p className="app-modal-sub">
          <strong className="app-modal-em">{state.title}</strong>
          {state.kind === 'folder' && state.fileCount != null
            ? ` · ${state.fileCount} file${state.fileCount === 1 ? '' : 's'}`
            : ''}
          {state.subtitle ? ` · ${state.subtitle}` : ''}
        </p>

        <label className="app-modal-label" htmlFor="share-link-input">
          Capability link
        </label>
        <div className="share-sheet-row">
          <input
            id="share-link-input"
            ref={inputRef}
            className="app-modal-input share-sheet-input"
            readOnly
            value={state.link}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="app-modal-btn app-modal-btn-primary share-sheet-copy"
            onClick={() => void copy()}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {err ? <p className="share-sheet-err">{err}</p> : null}

        <ul className="share-sheet-notes">
          <li>
            Decryption key sits in the URL <code>#fragment</code> — not sent to our
            servers.
          </li>
          <li>Anyone with the link can open and decrypt. No wallet needed to view.</li>
          <li>
            <strong>Lose the link → lose access.</strong> We do not keep a “shared
            with you” inbox.
          </li>
        </ul>

        <div className="app-modal-actions">
          <button type="button" className="app-modal-btn app-modal-btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="app-modal-btn app-modal-btn-primary"
            onClick={() => void copy()}
          >
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
