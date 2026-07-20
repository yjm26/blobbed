import React from "react";
import type { FileMetadata } from "../../../../scripts/types";
import { isImageMime, isVideoMime } from "../../../../scripts/preview";
import { fileTypeLabel, formatFileDate, formatFileSize } from "./driveFormat";

type BackendKind = "neon" | "memory" | "local" | string;

type FolderTarget = { id: string; name: string };

type Props = {
  files: FileMetadata[];
  selectedFiles: FileMetadata[];
  totalBytes: number;
  folderCount: number;
  vaultOk: boolean;
  backend: BackendKind;
  folders?: FolderTarget[];
  onPreview?: (id: string) => void;
  onShare?: (id: string) => void;
  onRename?: (id: string) => void;
  onMove?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBulkMove?: (folderId: string | null) => void;
  onBulkDelete?: () => void;
  onClearSelection?: () => void;
};

const panelClass =
  "sticky top-24 space-y-3 rounded-[18px] border border-white/8 bg-white/[0.018] p-4 text-sm text-white/70 shadow-[0_18px_60px_rgba(0,0,0,0.22)]";
const cardClass = "rounded-[14px] border border-white/8 bg-black/18 p-3.5";
const labelClass = "text-[0.64rem] uppercase tracking-[0.14em] text-white/34";
const valueClass = "mt-1 text-[0.92rem] leading-snug text-white/82";
const actionGridClass = "mt-3 grid grid-cols-2 gap-2";
const actionButtonClass =
  "min-h-10 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[0.72rem] font-medium text-white/78 transition-[border-color,background,color,opacity] duration-150 hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";
const primaryActionClass =
  "col-span-2 min-h-10 rounded-full border border-white/80 bg-white px-3 py-2 text-[0.72rem] font-semibold text-black transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";
const dangerActionClass =
  "min-h-10 rounded-full border border-red-300/18 bg-red-950/28 px-3 py-2 text-[0.72rem] font-medium text-red-100/82 transition-[border-color,background,color,opacity] duration-150 hover:border-red-200/28 hover:bg-red-950/42 hover:text-red-50 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";
const selectClass =
  "col-span-2 min-h-10 w-full cursor-pointer appearance-none rounded-full border border-white/12 bg-white/[0.035] px-3 py-2 text-[0.72rem] text-white/78 outline-none transition-[border-color,background] duration-150 focus:border-white/28 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";

function backendLabel(backend: BackendKind) {
  if (backend === "neon") return "Library synced";
  if (backend === "memory") return "Temporary sync";
  if (backend === "local") return "This device";
  return "Checking sync";
}

function shortBlob(blobName: string) {
  if (!blobName) return "—";
  if (blobName.length <= 18) return blobName;
  return `${blobName.slice(0, 8)}…${blobName.slice(-6)}`;
}

function canPreviewFile(file: FileMetadata) {
  return (
    isImageMime(file.mimeType, file.originalName) ||
    isVideoMime(file.mimeType, file.originalName)
  );
}

export default function DriveDetailsPanel({
  files,
  selectedFiles,
  totalBytes,
  folderCount,
  vaultOk,
  backend,
  folders = [],
  onPreview,
  onShare,
  onRename,
  onMove,
  onDelete,
  onBulkMove,
  onBulkDelete,
  onClearSelection,
}: Props) {
  const selectedBytes = selectedFiles.reduce(
    (sum, file) => sum + (file.sizeBytes || 0),
    0,
  );
  const primary = selectedFiles[0];
  const remaining = Math.max(0, selectedFiles.length - 1);
  const isMultiSelection = selectedFiles.length > 1;
  const primaryCanPreview = primary ? canPreviewFile(primary) : false;

  return (
    <aside className={panelClass} aria-label="Drive details panel">
      <div>
        <p className="m-0 text-[0.64rem] uppercase tracking-[0.16em] text-white/30">
          Context
        </p>
        <h2 className="m-0 mt-1 text-[1.05rem] font-light tracking-[-0.02em] text-white/90">
          {selectedFiles.length > 0 ? "Selected files" : "Security"}
        </h2>
      </div>

      {selectedFiles.length > 0 ? (
        <>
          <div className={cardClass}>
            <p className={labelClass}>Selection</p>
            <p className={valueClass}>
              {selectedFiles.length} selected · {formatFileSize(selectedBytes)}
            </p>
            {remaining > 0 ? (
              <p className="m-0 mt-2 text-[0.76rem] text-white/42">
                Showing first file. {remaining} more selected.
              </p>
            ) : null}
          </div>

          {primary ? (
            <div className={cardClass}>
              <p className={labelClass}>File details</p>
              <p className="m-0 mt-1 break-words text-[0.95rem] leading-snug text-white/88">
                {primary.originalName}
              </p>
              <dl className="mt-3 grid gap-2 text-[0.78rem] text-white/52">
                <div className="flex justify-between gap-3">
                  <dt>Type</dt>
                  <dd className="text-white/76">
                    {fileTypeLabel(primary.mimeType, primary.originalName)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Size</dt>
                  <dd className="text-white/76">
                    {formatFileSize(primary.sizeBytes)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Added</dt>
                  <dd className="text-white/76">
                    {formatFileDate(primary.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Blob</dt>
                  <dd
                    className="font-mono text-white/62"
                    title={primary.blobName}
                  >
                    {shortBlob(primary.blobName)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {primary ? (
            <div className={cardClass}>
              <p className={labelClass}>{isMultiSelection ? "Bulk actions" : "Actions"}</p>
              {isMultiSelection ? (
                <div className={actionGridClass}>
                  <label className="col-span-2">
                    <span className="sr-only">Move selected</span>
                    <select
                      className={selectClass}
                      defaultValue=""
                      disabled={!onBulkMove}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value || !onBulkMove) return;
                        onBulkMove(value === "__root__" ? null : value);
                        event.target.value = "";
                      }}
                    >
                      <option value="" disabled>
                        Move selected
                      </option>
                      <option value="__root__">All files (root)</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className={dangerActionClass}
                    disabled={!onBulkDelete}
                    onClick={() => onBulkDelete?.()}
                  >
                    Delete selected
                  </button>
                  <button
                    type="button"
                    className={actionButtonClass}
                    disabled={!onClearSelection}
                    onClick={() => onClearSelection?.()}
                  >
                    Clear selection
                  </button>
                </div>
              ) : (
                <div className={actionGridClass}>
                  <button
                    type="button"
                    className={primaryActionClass}
                    disabled={!primaryCanPreview || !onPreview}
                    onClick={() => onPreview?.(primary.id)}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className={actionButtonClass}
                    disabled={!onShare}
                    onClick={() => onShare?.(primary.id)}
                  >
                    Share link
                  </button>
                  <button
                    type="button"
                    className={actionButtonClass}
                    disabled={!onRename}
                    onClick={() => onRename?.(primary.id)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={actionButtonClass}
                    disabled={!onMove}
                    onClick={() => onMove?.(primary.id)}
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    className={dangerActionClass}
                    disabled={!onDelete}
                    onClick={() => onDelete?.(primary.id)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className={cardClass}>
            <p className={labelClass}>Security</p>
            <p className={valueClass}>
              {vaultOk
                ? "Encryption active"
                : "Encryption needs wallet approval"}
            </p>
            <p className="m-0 mt-2 text-[0.76rem] leading-relaxed text-white/44">
              Files encrypt on this device before upload. Blobs on Shelby store
              encrypted bytes only.
            </p>
          </div>

          <div className={cardClass}>
            <p className={labelClass}>Storage</p>
            <dl className="mt-2 grid gap-2 text-[0.78rem] text-white/52">
              <div className="flex justify-between gap-3">
                <dt>Files</dt>
                <dd className="text-white/76">{files.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Folders</dt>
                <dd className="text-white/76">{folderCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Used</dt>
                <dd className="text-white/76">{formatFileSize(totalBytes)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Sync</dt>
                <dd className="text-white/76">{backendLabel(backend)}</dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </aside>
  );
}
