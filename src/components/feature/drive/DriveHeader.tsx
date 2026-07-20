import React from 'react';
import type { FileKindFilter, SortKey } from '../../shared/FilterMenu';
import DriveToolbar from './DriveToolbar';

export type DriveHeaderProps = {
  folderName?: string | null;
  onBackToLibrary: () => void;
  fileCount: number;
  folderCount: number;
  looseFileCount: number;
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
  onUpload: () => void;
  onShareFolder?: () => void;
  onDeleteFolder?: () => void;
};

export default function DriveHeader({
  folderName,
  onBackToLibrary,
  fileCount,
  folderCount,
  looseFileCount,
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
  onUpload,
  onShareFolder,
  onDeleteFolder,
}: DriveHeaderProps) {
  const inFolder = Boolean(folderName);
  const subtitle = inFolder
    ? `${fileCount} file${fileCount === 1 ? '' : 's'} · live folder sharing available`
    : `${folderCount} folder${folderCount === 1 ? '' : 's'} · ${looseFileCount} loose file${
        looseFileCount === 1 ? '' : 's'
      } · encrypted before upload`;

  return (
    <div className="app-stage-head drive-stage-head">
      <div className="drive-stage-copy">
        {inFolder ? (
          <button type="button" className="app-back" onClick={onBackToLibrary}>
            ← Library
          </button>
        ) : null}
        <p className="drive-stage-kicker">Encrypted storage</p>
        <h1 className="app-stage-title">{folderName || 'Library'}</h1>
        <p className="app-stage-sub">{subtitle}</p>
      </div>

      <DriveToolbar
        inFolder={inFolder}
        viewMode={viewMode}
        onViewChange={onViewChange}
        filterOpen={filterOpen}
        onFilterOpenChange={onFilterOpenChange}
        filterQuery={filterQuery}
        onFilterQueryChange={onFilterQueryChange}
        filterKind={filterKind}
        onFilterKindChange={onFilterKindChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        resultCount={fileCount}
        onUpload={onUpload}
        onShareFolder={onShareFolder}
        onDeleteFolder={onDeleteFolder}
      />
    </div>
  );
}
