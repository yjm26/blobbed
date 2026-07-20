import React from 'react';
import type { FileMetadata } from '../../../../scripts/types';
import { isImageMime, isVideoMime } from '../../../../scripts/preview';
import DriveActionMenu, { type DriveAction } from './DriveActionMenu';
import { fileTypeLabel, formatFileDate, formatFileSize } from './driveFormat';

export type DriveFileListProps = {
  files: FileMetadata[];
  viewMode: 'list' | 'grid';
  thumbs: Map<string, string>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onPreview: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string) => void;
  onMove?: (id: string) => void;
};

const GRID_WRAP_CLASS =
  'mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-3.5 max-[560px]:grid-cols-1';

const GRID_CARD_CLASS =
  'group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] shadow-[0_12px_36px_rgba(0,0,0,0.16)] transition-[border-color,background,transform] duration-200 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.035] motion-reduce:transition-none motion-reduce:hover:translate-y-0';

const GRID_CARD_SELECTED_CLASS = 'border-white/25 bg-white/[0.05]';

const LIST_CARD_CLASS =
  'group relative flex items-center justify-between gap-4 border-b border-white/10 px-0.5 py-4 transition-colors duration-150 hover:bg-white/[0.02] max-[720px]:flex-col max-[720px]:items-start';

const THUMB_GRID_CLASS =
  'relative flex aspect-[4/3] h-auto w-full shrink-0 items-center justify-center overflow-hidden bg-white/[0.025]';

const THUMB_LIST_CLASS =
  'relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] max-[720px]:h-32 max-[720px]:w-full';

const SELECT_LABEL_GRID_CLASS =
  'absolute left-3 top-3 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/45 backdrop-blur-md transition-opacity duration-150 hover:bg-black/60 max-[560px]:h-11 max-[560px]:w-11';

const SELECT_LABEL_LIST_CLASS =
  'grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white/[0.035] transition-colors duration-150 hover:bg-white/[0.06] max-[720px]:absolute max-[720px]:left-3 max-[720px]:top-3 max-[720px]:z-10 max-[720px]:bg-black/45 max-[720px]:backdrop-blur-md max-[720px]:h-11 max-[720px]:w-11';

const SELECT_CHECK_CLASS =
  'peer h-4 w-4 cursor-pointer appearance-none rounded-[0.35rem] border border-white/30 bg-black/25 transition-[background,border-color,box-shadow] duration-150 checked:border-white checked:bg-white checked:shadow-[0_0_0_3px_rgba(255,255,255,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40';

const SELECT_TICK_CLASS =
  'pointer-events-none absolute h-2.5 w-1.5 rotate-45 border-b-2 border-r-2 border-black opacity-0 transition-opacity duration-150 peer-checked:opacity-100';

export default function DriveFileList({
  files,
  viewMode,
  thumbs,
  selectedIds,
  onToggleSelect,
  onPreview,
  onShare,
  onDelete,
  onRename,
  onMove,
}: DriveFileListProps) {
  if (!files.length) return null;

  return (
    <div
      className={viewMode === 'grid' ? GRID_WRAP_CLASS : 'flex flex-col border-t border-white/10'}
    >
      {files.map((f) => {
        const name = f.originalName || 'Untitled';
        const mime = f.mimeType || '';
        const canPreview =
          isImageMime(mime, name) || isVideoMime(mime, name);
        const thumb = thumbs.get(f.id);
        const video = isVideoMime(mime, name);
        const checked = selectedIds?.has(f.id) ?? false;
        const kindLabel = fileTypeLabel(mime, name);
        const menuActions: DriveAction[] = [
          ...(onRename
            ? [{ label: 'Rename', onSelect: () => onRename(f.id) }]
            : []),
          ...(onMove ? [{ label: 'Move', onSelect: () => onMove(f.id) }] : []),
          { label: 'Delete', tone: 'danger', onSelect: () => onDelete(f.id) },
        ];
        const articleClass =
          viewMode === 'grid'
            ? `${GRID_CARD_CLASS} ${checked ? GRID_CARD_SELECTED_CLASS : ''}`
            : `${LIST_CARD_CLASS} ${checked ? 'bg-white/[0.035]' : ''}`;
        const thumbClass = viewMode === 'grid' ? THUMB_GRID_CLASS : THUMB_LIST_CLASS;
        const selectClass =
          viewMode === 'grid' ? SELECT_LABEL_GRID_CLASS : SELECT_LABEL_LIST_CLASS;

        return (
          <article key={f.id} className={articleClass}>
            {onToggleSelect ? (
              <label className={selectClass} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className={SELECT_CHECK_CLASS}
                  checked={checked}
                  onChange={() => onToggleSelect(f.id)}
                  aria-label={`Select ${name}`}
                />
                <span className={SELECT_TICK_CLASS} aria-hidden="true" />
              </label>
            ) : null}

            <button
              type="button"
              className={thumbClass}
              onClick={() => {
                if (canPreview) onPreview(f.id);
              }}
              disabled={!canPreview}
              title={canPreview ? 'Preview' : undefined}
            >
              {thumb ? (
                <img className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100" src={thumb} alt="" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/20 text-[0.82rem] uppercase tracking-[0.12em] text-white/50">
                  {video ? '▶' : canPreview ? '…' : kindLabel.slice(0, 4)}
                </span>
              )}
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[0.6rem] uppercase tracking-[0.06em] text-[#ddd] backdrop-blur-sm">
                {kindLabel}
              </span>
            </button>

            <div className={viewMode === 'grid' ? 'min-w-0 px-3.5 pb-1 pt-3' : 'min-w-0 flex-1 max-[720px]:w-full'}>
              <h3
                className="m-0 truncate text-[0.9rem] font-normal tracking-[-0.01em] text-white/90"
                title={name}
              >
                {name}
              </h3>
              <p className="m-0 mt-1 text-[0.72rem] text-white/45">
                {formatFileSize(Number(f.sizeBytes || 0))} ·{' '}
                {formatFileDate(f.createdAt)}
              </p>
            </div>

            <div
              className={
                viewMode === 'grid'
                  ? 'flex flex-wrap items-center gap-1 px-2.5 pb-3 pt-1'
                  : 'flex shrink-0 items-center gap-2 max-[720px]:w-full max-[720px]:justify-between'
              }
            >
              {canPreview ? (
                <button
                  type="button"
                  className="min-h-8 border-0 bg-transparent px-1.5 py-1 text-[0.72rem] uppercase tracking-[0.08em] text-white/60 transition-colors duration-150 hover:text-white motion-reduce:transition-none"
                  onClick={() => onPreview(f.id)}
                >
                  {video ? 'Play' : 'Preview'}
                </button>
              ) : null}
              <button
                type="button"
                className="min-h-8 border-0 bg-transparent px-1.5 py-1 text-[0.72rem] uppercase tracking-[0.08em] text-white/88 transition-colors duration-150 hover:text-white motion-reduce:transition-none"
                onClick={() => onShare(f.id)}
              >
                Share
              </button>
              <DriveActionMenu actions={menuActions} align="up" />
            </div>
          </article>
        );
      })}
    </div>
  );
}
