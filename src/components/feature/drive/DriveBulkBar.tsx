import React from 'react';

export type DriveBulkBarProps = {
  count: number;
  folders: { id: string; name: string }[];
  onClear: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  busy?: boolean;
};

const BULK_BAR_CLASS =
  'fixed bottom-5 left-1/2 z-[60] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-4 rounded-full border border-white/10 bg-[rgba(12,12,14,0.92)] px-[0.85rem] py-[0.65rem] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl max-[560px]:bottom-0 max-[560px]:left-0 max-[560px]:right-0 max-[560px]:max-w-none max-[560px]:translate-x-0 max-[560px]:flex-col max-[560px]:items-stretch max-[560px]:gap-3 max-[560px]:rounded-b-none max-[560px]:rounded-t-2xl max-[560px]:px-4 max-[560px]:pt-4 max-[560px]:pb-[calc(env(safe-area-inset-bottom)+0.85rem)]';

const BULK_SELECT_CLASS =
  'min-h-10 max-w-[11rem] cursor-pointer appearance-none rounded-full border border-white/15 bg-white/5 px-[0.85rem] py-[0.45rem] text-[0.8125rem] text-[#f2f2f2] disabled:cursor-not-allowed disabled:opacity-50 max-[560px]:min-h-11 max-[560px]:w-full max-[560px]:max-w-none';

const BULK_BUTTON_BASE_CLASS =
  'min-h-10 cursor-pointer appearance-none rounded-full px-[0.9rem] py-[0.45rem] text-[0.75rem] font-medium transition-[opacity,background,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none max-[560px]:min-h-11 max-[560px]:flex-1';

const BULK_BUTTON_GHOST_CLASS = `${BULK_BUTTON_BASE_CLASS} border border-white/10 bg-transparent text-[#bdbdbd] hover:border-white/20 hover:text-white`;
const BULK_BUTTON_DANGER_CLASS = `${BULK_BUTTON_BASE_CLASS} border border-[#5a2828] bg-[#3a1818] text-[#f0c4c4] hover:bg-[#4a1e1e]`;

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
    <div className={BULK_BAR_CLASS} role="toolbar" aria-label="Bulk actions">
      <span className="pl-[0.35rem] text-[0.75rem] uppercase tracking-[0.06em] text-white/70 max-[560px]:pl-0 max-[560px]:text-center">
        {count} selected
      </span>
      <div className="flex flex-wrap items-center gap-[0.4rem] max-[560px]:grid max-[560px]:grid-cols-2 max-[560px]:gap-2">
        <label className="max-[560px]:col-span-2 max-[560px]:w-full">
          <span className="sr-only">Move to</span>
          <select
            className={BULK_SELECT_CLASS}
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
          className={BULK_BUTTON_DANGER_CLASS}
          disabled={busy}
          onClick={onDelete}
        >
          Delete
        </button>
        <button
          type="button"
          className={BULK_BUTTON_GHOST_CLASS}
          disabled={busy}
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
