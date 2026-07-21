import React, { useMemo } from 'react';

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

function itemPhase(item: QueueItem): string {
  if (item.status === 'running') return item.phase || 'Preparing file';
  if (item.status === 'queued') return 'Waiting';
  if (item.status === 'done') return 'Done';
  if (item.status === 'cancelled') return 'Cancelled';
  return 'Needs attention';
}

const linkButton =
  'border-0 bg-transparent px-1 py-0.5 text-[0.68rem] text-[rgba(200,195,185,0.65)] transition-colors duration-150 hover:text-white motion-reduce:transition-none';

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
  const completedCount = items.filter((i) => i.status === 'done').length;
  const header = running
    ? `${itemPhase(running)} · ${running.name}`
    : active.length
      ? `${active.length} waiting to upload`
      : `${done.length} completed`;

  return (
    <div
      className="fixed bottom-4 right-4 z-[80] w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(10,10,14,0.92)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-[14px] max-[720px]:inset-x-3 max-[720px]:bottom-3 max-[720px]:w-auto"
      role="region"
      aria-label="Upload queue"
    >
      <header className={`flex items-center justify-between gap-2 px-3 py-2 ${collapsed ? '' : 'border-b border-white/[0.06]'}`}>
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left text-[0.78rem] text-[rgba(230,228,220,0.9)]"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
        >
          <span
            className={`h-[7px] w-[7px] shrink-0 rounded-full ${
              active.length > 0
                ? 'animate-pulse bg-[#8ab4ff] shadow-[0_0_8px_rgba(120,160,255,0.55)]'
                : 'bg-[#6a6a72]'
            }`}
          />
          <span className="truncate">{header}</span>
          <span className="ml-1 text-[0.7rem] opacity-45">{items.length}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {items.length > 1 ? (
            <span className="whitespace-nowrap text-[0.62rem] text-[rgba(200,195,185,0.45)]">
              {completedCount} of {items.length} complete
            </span>
          ) : null}
          {done.length > 0 ? (
            <button type="button" className={linkButton} onClick={onClearDone}>
              Clear done
            </button>
          ) : null}
          <button
            type="button"
            className={linkButton}
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand queue' : 'Collapse queue'}
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </header>

      {!collapsed ? (
        <ul className="m-0 max-h-60 list-none overflow-auto px-2 py-1.5 pb-2">
          {items.map((item) => {
            const pct = Math.round(Math.min(1, Math.max(0, item.ratio ?? 0)) * 100);
            return (
              <li key={item.id} className="border-b border-white/[0.04] px-1 py-2 last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="m-0 max-w-[220px] truncate text-[0.78rem] text-[rgba(235,232,225,0.92)]" title={item.name}>
                      {item.name}
                    </p>
                    <p
                      className={`m-0 mt-1 max-w-[230px] truncate text-[0.66rem] leading-[1.35] ${
                        item.status === 'done'
                          ? 'text-[#9bbb9b]'
                          : item.status === 'error'
                            ? 'text-[rgba(255,205,205,0.66)]'
                            : 'text-[rgba(180,175,165,0.55)]'
                      }`}
                    >
                      {formatSize(item.size)} · {itemPhase(item)}
                    </p>
                    {item.status === 'error' && item.error ? (
                      <p className="m-0 mt-1 max-w-[230px] whitespace-normal text-[0.66rem] leading-[1.35] text-[#e8a0a0]">{item.error}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.status === 'running' || item.status === 'queued' ? (
                      <button type="button" className={linkButton} onClick={() => onCancel(item.id)}>
                        Cancel
                      </button>
                    ) : null}
                    {item.status === 'error' || item.status === 'cancelled' ? (
                      <button type="button" className={linkButton} onClick={() => onRetry(item.id)}>
                        Retry
                      </button>
                    ) : null}
                    {item.status === 'done' || item.status === 'error' || item.status === 'cancelled' ? (
                      <button type="button" className={linkButton} onClick={() => onDismiss(item.id)}>
                        ✕
                      </button>
                    ) : null}
                  </div>
                </div>
                {(item.status === 'running' || item.status === 'queued') && (
                  <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-[linear-gradient(90deg,#6a8cff,#b8a0ff)] transition-[width] duration-200"
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
