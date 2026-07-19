import React from 'react';
import type { FolderMetadata } from '../../../../scripts/types';

export type DriveFolderGridProps = {
  folders: FolderMetadata[];
  countInFolder: (id: string) => number;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string) => void;
};

/** Folder cards — square mark (▢), not emoji. */
export default function DriveFolderGrid({
  folders,
  countInFolder,
  onOpen,
  onDelete,
  onRename,
}: DriveFolderGridProps) {
  if (!folders.length) return null;

  return (
    <div className="drive-folder-grid">
      {folders.map((f) => (
        <div key={f.id} className="drive-folder-card-wrap">
          <button
            type="button"
            className="drive-folder-card"
            onClick={() => onOpen(f.id)}
          >
            <span className="drive-folder-icon">▢</span>
            <span className="drive-folder-name">{f.name}</span>
            <span className="drive-folder-meta">
              {countInFolder(f.id)} items
            </span>
          </button>
          <div className="drive-folder-card-actions">
            {onRename ? (
              <button
                type="button"
                className="drive-folder-delete"
                title={`Rename ${f.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(f.id);
                }}
              >
                Rename
              </button>
            ) : null}
            <button
              type="button"
              className="drive-folder-delete"
              title={`Delete ${f.name}`}
              aria-label={`Delete folder ${f.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(f.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
