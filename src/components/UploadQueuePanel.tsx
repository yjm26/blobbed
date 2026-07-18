import React, { useEffect, useMemo, useState } from 'react';

export type QueueItemStatus =
  | 'queued'
  | 'running'
  | 'done'
  | 'error'
  | 'cancelled';

export type QueueItem = {
  id: string;
  name: string;
  size: number;
  status: QueueItemStatus;
  phase?: string;
  ratio?: number;
  error?: string;
};

type Props = {
  items: QueueItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearDone: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function UploadQueuePanel({
  items,
  onRetry,
  onCancel,
  onDismiss,
  onClearDone,
  collapsed,
  onToggleCollapse,
}: Props) {
  const active = useMemo(
    () => items.filter((i) => i.status === 'queued' || i.status === 'running'),
    [items]
  );
  const done = useMemo(
    () => items.filter((i) => i.status === 'done' || i.status === 'error' || i.status === 'cancelled'),
    [items]
  );

  if (!items.length) return null;

  const running = items.find((i) => i.status === 'running');
  const header = running
    ? `Uploading · ${running.name}`
    : active.length
      ? `${active.length} in queue`
      : `${done.length} finished`;

  return (
    <div className={`upload-queue ${collapsed ? 'is-collapsed' : ''}`} role="region" aria-label="Upload queue">
      <header className="upload-queue-head">
        <button
          type="button"
          className="upload-queue-title"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
        >
          <span className="upload-queue-dot" data-busy={active.length > 0 ? '1' : '0'} />
          {header}
          <span className="upload-queue-count">{items.length}</span>
        </button>
        <div className="upload-queue-head-actions">
          {done.length > 0 ? (
            <button type="button" className="upload-queue-link" onClick={onClearDone}>
              Clear done
            </button>
          ) : null}
          <button
            type="button"
            className="upload-queue-link"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand queue' : 'Collapse queue'}
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </header>

      {!collapsed ? (
        <ul className="upload-queue-list">
          {items.map((item) => {
            const pct = Math.round(Math.min(1, Math.max(0, item.ratio ?? 0)) * 100);
            return (
              <li key={item.id} className="upload-queue-item" data-status={item.status}>
                <div className="upload-queue-item-top">
                  <div className="upload-queue-meta">
                    <p className="upload-queue-name" title={item.name}>
                      {item.name}
                    </p>
                    <p className="upload-queue-sub">
                      {formatSize(item.size)}
                      {item.status === 'running' && item.phase
                        ? ` · ${item.phase}`
                        : item.status === 'queued'
                          ? ' · waiting'
                          : item.status === 'done'
                            ? ' · done'
                            : item.status === 'cancelled'
                              ? ' · cancelled'
                              : item.error
                                ? ` · ${item.error}`
                                : ''}
                    </p>
                  </div>
                  <div className="upload-queue-actions">
                    {item.status === 'running' || item.status === 'queued' ? (
                      <button type="button" className="upload-queue-link" onClick={() => onCancel(item.id)}>
                        Cancel
                      </button>
                    ) : null}
                    {item.status === 'error' || item.status === 'cancelled' ? (
                      <button type="button" className="upload-queue-link" onClick={() => onRetry(item.id)}>
                        Retry
                      </button>
                    ) : null}
                    {item.status === 'done' || item.status === 'error' || item.status === 'cancelled' ? (
                      <button type="button" className="upload-queue-link" onClick={() => onDismiss(item.id)}>
                        ✕
                      </button>
                    ) : null}
                  </div>
                </div>
                {(item.status === 'running' || item.status === 'queued') && (
                  <div className="upload-queue-bar" aria-hidden="true">
                    <span
                      className="upload-queue-bar-fill"
                      style={{
                        width:
                          item.status === 'queued'
                            ? '4%'
                            : `${Math.max(6, pct)}%`,
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Tiny hook helper types for parent. files retained for retry */
export type QueueJob = QueueItem & {
  file: File;
  folderId: string | null;
  controller?: AbortController;
};
