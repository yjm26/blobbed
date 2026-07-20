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

const FOLDER_GRID_CLASS =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),16rem))] justify-start gap-3.5 max-[560px]:grid-cols-1';

const FOLDER_CARD_CLASS =
  'group relative flex aspect-[4/3] min-h-[9.5rem] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_90%_70%_at_18%_0%,rgba(145,165,190,0.12),transparent_68%),rgba(255,255,255,0.018)] p-4 text-left font-[inherit] text-inherit shadow-[0_14px_42px_rgba(0,0,0,0.18)] transition-[border-color,background,transform] duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/35 motion-reduce:transition-none motion-reduce:hover:translate-y-0 max-[560px]:aspect-auto max-[560px]:min-h-[7.25rem]';

export default function DriveFolderGrid({
  folders,
  countInFolder,
  onOpen,
  onDelete,
  onRename,
}: DriveFolderGridProps) {
  if (!folders.length) return null;

  return (
    <div className={FOLDER_GRID_CLASS} aria-label="Folders">
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
          <article key={f.id} className="relative min-w-0">
            <button
              type="button"
              className={FOLDER_CARD_CLASS}
              onClick={() => onOpen(f.id)}
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  className="relative grid h-11 w-13 place-items-center rounded-xl border border-white/12 bg-white/[0.045] text-white/70 shadow-inner shadow-white/[0.03] before:absolute before:left-2 before:top-[-0.28rem] before:h-2 before:w-6 before:rounded-t-md before:border before:border-b-0 before:border-white/12 before:bg-white/[0.04]"
                  aria-hidden="true"
                >
                  <span className="h-3 w-7 rounded-sm border border-white/20 bg-white/[0.035]" />
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[0.62rem] uppercase tracking-[0.08em] text-white/42">
                  Folder
                </span>
              </span>

              <span className="min-w-0">
                <span className="block truncate text-[0.98rem] font-normal tracking-[-0.015em] text-white/90">
                  {f.name}
                </span>
                <span className="mt-1 block text-[0.75rem] text-white/48">
                  {count} item{count === 1 ? '' : 's'} · private index
                </span>
              </span>
            </button>
            <div className="absolute bottom-3 right-3 text-white/52 transition-colors duration-150 group-hover:text-white/80">
              <DriveActionMenu label="More" actions={actions} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
