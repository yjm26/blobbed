import React from 'react';
import type { FolderMetadata } from '../../../scripts/types';

export type DriveLayoutProps = {
  children: React.ReactNode;
  folders: FolderMetadata[];
  folderId: string | null;
  onSelectAll: () => void;
  onSelectFolder: (id: string) => void;
  onNewFolder: () => void;
  onUpload: () => void;
  countInFolder: (folderId: string) => number;
  railFoot?: string;
};

const ghostButton = 'w-full border border-[var(--border)] bg-transparent px-4 py-3 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--text)] transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.04] motion-reduce:transition-none';
const uploadButton = 'w-full border-0 bg-[#f2f2f2] px-4 py-3 text-[0.6875rem] font-normal uppercase tracking-[0.14em] text-[#0a0a0a] transition-opacity duration-150 hover:opacity-90 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100';
const railItem = 'flex min-h-9 w-full items-center justify-between border-l border-transparent bg-transparent px-2 py-2 text-left text-sm font-light text-[var(--text-2)] transition-colors duration-150 hover:text-[var(--text)] motion-reduce:transition-none max-[800px]:w-auto max-[800px]:shrink-0 max-[800px]:whitespace-nowrap max-[800px]:border-l-0 max-[800px]:px-2.5';
const activeRailItem = 'border-l-[var(--text)] pl-3 text-[var(--text)] max-[800px]:border-b max-[800px]:border-b-[var(--text)] max-[800px]:pl-2.5';

/**
 * Shell: sidebar rail (Library + folders under All files) + stage.
 */
export default function DriveLayout({
  children,
  folders,
  folderId,
  onSelectAll,
  onSelectFolder,
  onNewFolder,
  onUpload,
  countInFolder,
  railFoot,
}: DriveLayoutProps) {
  return (
    <main className="grid min-h-0 flex-1 grid-cols-[15.5rem_minmax(0,1fr)] max-[800px]:grid-cols-1">
      <aside className="flex flex-col gap-7 border-r border-[var(--border)] px-5 py-6 max-[800px]:gap-4 max-[800px]:border-r-0 max-[800px]:border-b max-[800px]:px-4 max-[800px]:py-4">
        <button
          type="button"
          className={ghostButton}
          onClick={onNewFolder}
        >
          New folder
        </button>
        <button type="button" className={uploadButton} onClick={onUpload}>
          Upload files
        </button>

        <nav className="flex flex-col gap-1 max-[800px]:flex-row max-[800px]:flex-wrap max-[800px]:items-center max-[800px]:gap-x-3 max-[800px]:gap-y-1" aria-label="Library">
          <p className="mb-2 text-[0.625rem] uppercase tracking-[0.16em] text-[var(--text-3)] max-[800px]:mb-1 max-[800px]:w-full">Library</p>
          <button
            type="button"
            className={`${railItem} ${folderId === null ? activeRailItem : ''}`}
            onClick={onSelectAll}
          >
            <span>All files</span>
          </button>
          <div className="flex flex-col gap-0.5 max-[800px]:-mx-1 max-[800px]:max-w-full max-[800px]:flex-row max-[800px]:flex-nowrap max-[800px]:gap-1 max-[800px]:overflow-x-auto max-[800px]:px-1 max-[800px]:pb-1 [scrollbar-width:none] max-[800px]:[&::-webkit-scrollbar]:hidden">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${railItem} ${folderId === f.id ? activeRailItem : ''}`}
                onClick={() => onSelectFolder(f.id)}
              >
                <span>{f.name}</span>
                <span className="ml-3 text-[0.625rem] tracking-normal text-[var(--text-3)]">{countInFolder(f.id)}</span>
              </button>
            ))}
          </div>
        </nav>

        <p className="mt-auto text-[0.6875rem] leading-[1.5] text-[var(--text-3)] max-[800px]:hidden">
          {railFoot || 'Encrypted on device. Blobs on Shelby.'}
        </p>
      </aside>

      <section className="flex min-w-0 flex-col gap-5 px-4 py-4 pb-12 sm:px-6 sm:py-5 lg:px-10">{children}</section>
    </main>
  );
}
