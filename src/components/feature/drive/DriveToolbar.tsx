import React from 'react';
import FilterMenu, {
  type FileKindFilter,
  type SortKey,
} from '../../shared/FilterMenu';

export type DriveToolbarProps = {
  inFolder: boolean;
  viewMode: 'list' | 'grid';
  onViewChange: (mode: 'list' | 'grid') => void;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  filterQuery: string;
  onFilterQueryChange: (q: string) => void;
  filterKind: FileKindFilter;
  onFilterKindChange: (k: FileKindFilter) => void;
  sortBy: SortKey;
  onSortChange: (s: SortKey) => void;
  resultCount: number;
  onUpload: () => void;
  onShareFolder?: () => void;
  onDeleteFolder?: () => void;
};

const toolBase =
  'rounded-full px-2.5 py-1 text-[0.7rem] text-white/60 transition hover:text-white max-[560px]:min-h-11 max-[560px]:flex-1';
const toolActive = 'bg-white/10 text-[#f0ebe3]';
const secondaryButton =
  'border border-white/10 bg-white/[0.02] px-3 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-white/62 transition hover:border-white/22 hover:text-white max-[560px]:min-h-11 max-[560px]:w-full';
const dangerButton =
  'border-red-200/12 text-red-200/62 hover:border-red-200/25 hover:text-red-100';

export default function DriveToolbar({
  inFolder,
  viewMode,
  onViewChange,
  filterOpen,
  onFilterOpenChange,
  filterQuery,
  onFilterQueryChange,
  filterKind,
  onFilterKindChange,
  sortBy,
  onSortChange,
  resultCount,
  onUpload,
  onShareFolder,
  onDeleteFolder,
}: DriveToolbarProps) {
  return (
    <div
      className="flex max-w-full flex-wrap items-center justify-start gap-2 sm:justify-end max-[560px]:grid max-[560px]:w-full max-[560px]:grid-cols-2"
      aria-label="Drive actions"
    >
      <div
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1 max-[560px]:col-span-2 max-[560px]:w-full"
        role="group"
        aria-label="View options"
      >
        <button
          type="button"
          className={`${toolBase} ${viewMode === 'list' ? toolActive : ''}`}
          onClick={() => onViewChange('list')}
          title="List view"
        >
          List
        </button>
        <button
          type="button"
          className={`${toolBase} ${viewMode === 'grid' ? toolActive : ''}`}
          onClick={() => onViewChange('grid')}
          title="Grid view"
        >
          Grid
        </button>
        <FilterMenu
          open={filterOpen}
          onOpenChange={onFilterOpenChange}
          query={filterQuery}
          onQueryChange={onFilterQueryChange}
          kind={filterKind}
          onKindChange={onFilterKindChange}
          sort={sortBy}
          onSortChange={onSortChange}
          resultCount={resultCount}
          showSearch={false}
        />
      </div>

      {inFolder && onShareFolder ? (
        <button type="button" className={secondaryButton} onClick={onShareFolder}>
          Share folder
        </button>
      ) : null}
      {inFolder && onDeleteFolder ? (
        <button
          type="button"
          className={`${secondaryButton} ${dangerButton}`}
          onClick={onDeleteFolder}
        >
          Delete folder
        </button>
      ) : null}
      <button
        type="button"
        className="min-w-28 border border-white bg-white px-4 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-black transition hover:bg-[#e8e1d7] max-[560px]:col-span-2 max-[560px]:min-h-11 max-[560px]:w-full"
        onClick={onUpload}
      >
        Upload
      </button>
    </div>
  );
}
