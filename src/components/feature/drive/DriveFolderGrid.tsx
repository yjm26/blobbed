import React from 'react';
import type { FolderMetadata } from '../../../../scripts/types';
import DriveActionMenu, { type DriveAction } from './DriveActionMenu';

export type DriveFolderGridProps = {
  folders: FolderMetadata[];
  countInFolder: (id: string) => number;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string) => void;
};

/** Folder cards — custom minimal folder mark, secondary actions tucked away. */
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
      {folders.map((f) => {
        const count = countInFolder(f.id);
        const actions: DriveAction[] = [
          ...(onRename
            ? [{ label: 'Rename folder', onSelect: () => onRename(f.id) }]
            : []),
          {
            label: 'Delete folder',
            tone: 'danger',
            onSelect: () => onDelete(f.id),
          },
        ];
        return (
          <div key={f.id} className="drive-folder-card-wrap">
            <button
              type="button"
              className="drive-folder-card"
              onClick={() => onOpen(f.id)}
            >
              <span className="drive-folder-icon" aria-hidden="true">
                <span />
              </span>
              <span className="drive-folder-name">{f.name}</span>
              <span className="drive-folder-meta">
                {count} item{count === 1 ? '' : 's'}
              </span>
            </button>
            <DriveActionMenu label="More" actions={actions} />
          </div>
        );
      })}
    </div>
  );
}
