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

  const isFolder = state.kind === 'folder';

  async function copy() {
    try {
      await navigator.clipboard.writeText(state!.link);
      setCopied(true);
      setErr('');
      window.setTimeout(() => setCopied(false), 2600);
    } catch {
      setErr('Clipboard blocked. Select the link and copy manually.');
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
        <p className="share-sheet-kicker">Capability link</p>
        <h2 id="share-sheet-title" className="app-modal-title">
          {isFolder ? 'Live folder link ready' : 'File link ready'}
        </h2>
        <p className="app-modal-sub">
          <strong className="app-modal-em">{state.title}</strong>
          {isFolder && state.fileCount != null
            ? ` · ${state.fileCount} file${state.fileCount === 1 ? '' : 's'}`
            : ''}
          {state.subtitle ? ` · ${state.subtitle}` : ''}
        </p>
        {isFolder ? (
          <div className="share-sheet-badge-row">
            <span>Live folder</span>
            <span>New files appear automatically</span>
          </div>
        ) : null}

        <label className="app-modal-label" htmlFor="share-link-input">
          Link
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
        {copied ? (
          <p className="share-sheet-ok">
            Copied. Anyone with this link can decrypt in their browser.
          </p>
        ) : null}
        {err ? <p className="share-sheet-err">{err}</p> : null}

        <ul className="share-sheet-notes">
          <li>The decryption key stays in the URL fragment, not API requests.</li>
          <li>Recipients do not need a wallet.</li>
          <li>Anyone with the link can decrypt. Rotate or revoke folder links when needed.</li>
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
