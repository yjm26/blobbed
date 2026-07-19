import React from 'react';

export type DriveBulkBarProps = {
  count: number;
  folders: { id: string; name: string }[];
  onClear: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  busy?: boolean;
};

/** Fixed bottom bar when files are multi-selected. */
export default function DriveBulkBar({
  count,
  folders,
  onClear,
  onDelete,
  onMove,
  busy = false,
}: DriveBulkBarProps) {
  if (count <= 0) return null;

  return (
    <div className="drive-bulk-bar" role="toolbar" aria-label="Bulk actions">
      <span className="drive-bulk-count">
        {count} selected
      </span>
      <div className="drive-bulk-actions">
        <label className="drive-bulk-move">
          <span className="sr-only">Move to</span>
          <select
            className="drive-bulk-select"
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') return;
              onMove(v === '__root__' ? null : v);
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              Move to…
            </option>
            <option value="__root__">All files (root)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="app-modal-btn app-modal-btn-danger"
          disabled={busy}
          onClick={onDelete}
        >
          Delete
        </button>
        <button
          type="button"
          className="app-modal-btn app-modal-btn-ghost"
          disabled={busy}
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
