import React, { useEffect, useRef } from 'react';

export type FileKindFilter = 'all' | 'image' | 'video' | 'other';
export type SortKey = 'newest' | 'name' | 'size';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (q: string) => void;
  kind: FileKindFilter;
  onKindChange: (k: FileKindFilter) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  resultCount?: number;
};

const KINDS: { id: FileKindFilter; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'other', label: 'Other' },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'name', label: 'Name' },
  { id: 'size', label: 'Size' },
];

export default function FilterMenu({
  open,
  onOpenChange,
  query,
  onQueryChange,
  kind,
  onKindChange,
  sort,
  onSortChange,
  resultCount,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active =
    query.trim().length > 0 || kind !== 'all' || sort !== 'newest';

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  function clearAll() {
    onQueryChange('');
    onKindChange('all');
    onSortChange('newest');
  }

  return (
    <div className={`filter-menu ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`filter-menu-trigger ${active ? 'is-active' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
      >
        Filter
        {active ? <span className="filter-menu-dot" aria-hidden="true" /> : null}
        <span className="filter-menu-chevron" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open ? (
        <div className="filter-menu-panel" role="dialog" aria-label="Filter files">
          <label className="filter-menu-label" htmlFor="drive-filter-search">
            Search
          </label>
          <input
            id="drive-filter-search"
            ref={inputRef}
            className="filter-menu-search"
            type="search"
            placeholder="Name…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoComplete="off"
          />

          <p className="filter-menu-label">Type</p>
          <div className="filter-menu-chips" role="group" aria-label="File type">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`filter-chip ${kind === k.id ? 'is-active' : ''}`}
                onClick={() => onKindChange(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>

          <p className="filter-menu-label">Sort</p>
          <div className="filter-menu-chips" role="group" aria-label="Sort">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`filter-chip ${sort === s.id ? 'is-active' : ''}`}
                onClick={() => onSortChange(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="filter-menu-foot">
            <span className="filter-menu-count">
              {typeof resultCount === 'number'
                ? `${resultCount} result${resultCount === 1 ? '' : 's'}`
                : ''}
            </span>
            {active ? (
              <button type="button" className="filter-menu-clear" onClick={clearAll}>
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
