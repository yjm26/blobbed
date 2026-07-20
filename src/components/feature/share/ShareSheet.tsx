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

const pillClass =
  'border border-[rgba(145,185,168,0.2)] bg-[rgba(60,95,82,0.14)] px-2 py-1 text-[0.64rem] uppercase tracking-[0.08em] text-[rgba(205,235,220,0.72)]';
const modalButton =
  'rounded-full px-4 py-2 text-[0.8125rem] font-medium transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';
const ghostButton = `${modalButton} border border-white/[0.12] bg-transparent text-[#bdbdbd] hover:border-white/25 hover:text-white`;
const primaryButton = `${modalButton} border border-[#f0f0f0] bg-[#f0f0f0] text-[#0a0a0a] hover:opacity-90`;

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
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-5 backdrop-blur-md"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-[min(100%,27.5rem)] rounded-[14px] border border-white/10 bg-[#121212] px-5 py-5 shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="m-0 mb-2 text-[0.64rem] uppercase tracking-[0.16em] text-white/40">Capability link</p>
        <h2 id="share-sheet-title" className="m-0 text-[1.05rem] font-medium tracking-[-0.02em] text-[#f2f2f2]">
          {isFolder ? 'Live folder link ready' : 'File link ready'}
        </h2>
        <p className="m-0 mt-2 text-[0.8125rem] leading-[1.45] text-[#8a8a8a]">
          <strong className="font-medium text-[#e8e8e8]">{state.title}</strong>
          {isFolder && state.fileCount != null
            ? ` · ${state.fileCount} file${state.fileCount === 1 ? '' : 's'}`
            : ''}
          {state.subtitle ? ` · ${state.subtitle}` : ''}
        </p>
        {isFolder ? (
          <div className="my-4 flex flex-wrap gap-1.5">
            <span className={pillClass}>Live folder</span>
            <span className={pillClass}>New files appear automatically</span>
          </div>
        ) : null}

        <label className="mt-5 mb-2 block text-[0.6875rem] uppercase tracking-[0.1em] text-[#6e6e6e]" htmlFor="share-link-input">
          Link
        </label>
        <div className="flex items-stretch gap-2 max-[480px]:flex-col">
          <input
            id="share-link-input"
            ref={inputRef}
            className="min-w-0 flex-1 rounded-[10px] border border-white/[0.12] bg-[#0a0a0a] px-3 py-3 text-[0.72rem] text-[#f5f5f5] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[rgba(200,200,255,0.35)] focus:shadow-[0_0_0_3px_rgba(180,180,255,0.08)]"
            readOnly
            value={state.link}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className={`${primaryButton} shrink-0`}
            onClick={() => void copy()}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {copied ? (
          <p className="m-0 mt-2 text-[0.72rem] text-[rgba(180,220,185,0.74)]">
            Copied. Anyone with this link can decrypt in their browser.
          </p>
        ) : null}
        {err ? <p className="m-0 mt-2 text-[0.72rem] text-[#e8a0a0]">{err}</p> : null}

        <ul className="m-0 mt-4 list-disc space-y-1 pl-5 text-[0.72rem] leading-[1.45] text-[rgba(200,195,185,0.58)] [&_code]:text-[#c8b8a0]">
          <li>The decryption key stays in the URL fragment, not API requests.</li>
          <li>Recipients do not need a wallet.</li>
          <li>Anyone with the link can decrypt. Rotate or revoke folder links when needed.</li>
        </ul>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={ghostButton} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={primaryButton}
            onClick={() => void copy()}
          >
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
