import React from 'react';

interface DriveToolbarProps {
  onRefresh?: () => void;
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export default function DriveToolbar({
  onRefresh,
  onSearch,
  searchValue = '',
}: DriveToolbarProps) {
  return (
    <div className="app-toolbar-secondary">
      <input
        type="text"
        className="app-search"
        placeholder="Search files..."
        value={searchValue}
        onChange={(e) => onSearch?.(e.target.value)}
      />
      <button
        type="button"
        className="app-btn-ghost"
        onClick={onRefresh}
      >
        Refresh
      </button>
    </div>
  );
}
