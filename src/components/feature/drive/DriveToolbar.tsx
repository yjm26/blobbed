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
    <div className="drive-toolbar" aria-label="Drive actions">
      <div className="app-toolbar drive-toolbar-panel" role="group" aria-label="View options">
        <button
          type="button"
          className={`app-tool ${viewMode === 'list' ? 'is-active' : ''}`}
          onClick={() => onViewChange('list')}
          title="List view"
        >
          List
        </button>
        <button
          type="button"
          className={`app-tool ${viewMode === 'grid' ? 'is-active' : ''}`}
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
        />
      </div>

      {inFolder && onShareFolder ? (
        <button type="button" className="app-btn-ghost" onClick={onShareFolder}>
          Share folder
        </button>
      ) : null}
      {inFolder && onDeleteFolder ? (
        <button
          type="button"
          className="app-btn-ghost app-btn-ghost-danger"
          onClick={onDeleteFolder}
        >
          Delete folder
        </button>
      ) : null}
      <button type="button" className="app-upload-cta drive-toolbar-upload" onClick={onUpload}>
        Upload
      </button>
    </div>
  );
}
