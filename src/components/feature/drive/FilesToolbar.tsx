import React from 'react';

type Props = {
  query: string;
  onQueryChange: (query: string) => void;
  fileCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

const actionButton =
  'min-h-9 rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.1em] text-white/58 transition-colors duration-150 hover:border-white/22 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none max-[560px]:min-h-11 max-[560px]:w-full';

export default function FilesToolbar({
  query,
  onQueryChange,
  fileCount,
  selectedCount,
  onSelectAll,
  onClearSelection,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-2.5 max-[720px]:flex-col max-[720px]:items-stretch max-[560px]:rounded-xl">
      <label className="relative min-w-[min(100%,20rem)] flex-1 max-[720px]:min-w-0 max-[560px]:w-full">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.74rem] text-white/32" aria-hidden="true">
          Search
        </span>
        <input
          type="search"
          value={query}
          placeholder="Search files and folders"
          className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 pl-[4.5rem] text-[0.86rem] text-white/88 outline-none transition-[border-color,background] duration-150 placeholder:text-white/28 focus:border-white/24 focus:bg-black/30 motion-reduce:transition-none max-[560px]:h-11"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:justify-between max-[560px]:grid max-[560px]:grid-cols-2">
        <span className="px-1 text-[0.72rem] text-white/42 max-[560px]:col-span-2 max-[560px]:w-full">
          {fileCount} file{fileCount === 1 ? '' : 's'}
          {selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
        </span>
        <button type="button" className={actionButton} onClick={onSelectAll}>
          Select all
        </button>
        <button
          type="button"
          className={actionButton}
          disabled={selectedCount === 0}
          onClick={onClearSelection}
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}
