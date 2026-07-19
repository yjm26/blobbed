import React from 'react';
import FilterMenu, { type FileKindFilter, type SortKey } from '../../shared/FilterMenu';

interface DriveHeaderProps {
  folderName?: string;
  onNewFolder?: () => void;
  onUpload?: () => void;
  // tambahan props yang biasa dipakai di legacy
  viewMode?: 'list' | 'grid';
  onViewChange?: (mode: 'list' | 'grid') => void;
  filterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;
  filterQuery?: string;
  onFilterQueryChange?: (q: string) => void;
  filterKind?: FileKindFilter;
  onFilterKindChange?: (k: FileKindFilter) => void;
  sortBy?: SortKey;
  onSortChange?: (s: SortKey) => void;
  fileCount?: number;
  folderCount?: number;
  onShareFolder?: () => void;
  onDeleteFolder?: () => void;
}

export default function DriveHeader({
  folderName,
  onNewFolder,
  onUpload,
  viewMode = 'list',
  onViewChange,
  filterOpen = false,
  onFilterOpenChange,
  filterQuery = '',
  onFilterQueryChange,
  filterKind = 'all',
  onFilterKindChange,
  sortBy = 'date',
  onSortChange,
  fileCount = 0,
  folderCount = 0,
  onShareFolder,
  onDeleteFolder,
}: DriveHeaderProps) {
  return (
    <div className="app-stage-head">
      <div>
        {folderName ? (
          <button
            type="button"
            className="app-back"
            onClick={() => window.history.back()} // placeholder, nanti disesuaikan
          >
            ← Library
          </button>
        ) : null}
        <h1 className="app-stage-title">
          {folderName || 'Library'}
        </h1>
        <p className="app-stage-sub">
          {folderName
            ? `${fileCount} file${fileCount === 1 ? '' : 's'} in this folder`
            : `${folderCount} folder${folderCount === 1 ? '' : 's'} · ${fileCount} loose file${fileCount === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="app-stage-actions">
        <div className="app-toolbar" role="group" aria-label="View options">
          <button
            type="button"
            className={`app-tool ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => onViewChange?.('list')}
            title="List view"
          >
            List
          </button>
          <button
            type="button"
            className={`app-tool ${viewMode === 'grid' ? 'is-active' : ''}`}
            onClick={() => onViewChange?.('grid')}
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
            resultCount={fileCount}
          />
        </div>

        {folderName ? (
          <>
            <button
              type="button"
              className="app-btn-ghost"
              onClick={onShareFolder}
            >
              Share folder
            </button>
            <button
              type="button"
              className="app-btn-ghost app-btn-ghost-danger"
              onClick={onDeleteFolder}
            >
              Delete folder
            </button>
          </>
        ) : null}

        <button
          type="button"
          className="app-btn-ghost"
          onClick={onUpload}
        >
          Upload
        </button>
      </div>
    </div>
  );
}
