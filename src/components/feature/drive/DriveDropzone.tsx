import React from 'react';

export type DriveDropzoneProps = {
  compact: boolean;
  dragging: boolean;
  hint: string;
  onBrowse: () => void;
  onDrag: (active: boolean) => void;
  onDropFiles: (files: FileList) => void;
};

export default function DriveDropzone({
  compact,
  dragging,
  hint,
  onBrowse,
  onDrag,
  onDropFiles,
}: DriveDropzoneProps) {
  const title = dragging
    ? 'Release to encrypt locally'
    : compact
      ? 'Add encrypted files'
      : 'Drop files to encrypt and store';
  const detail = dragging ? 'Ciphertext uploads after encryption' : hint;

  return (
    <div
      className={`flex cursor-pointer items-center rounded-2xl border border-dashed p-6 outline-none transition-[border-color,background,transform] duration-200 active:scale-[0.995] motion-reduce:transition-none motion-reduce:active:scale-100 max-[560px]:items-start ${
        compact
          ? 'min-h-18 flex-row justify-start gap-4 px-5 py-4 max-[560px]:px-4'
          : 'min-h-44 flex-col justify-center gap-1.5 text-center max-[560px]:min-h-32'
      } ${
        dragging
          ? 'border-white/28 bg-white/[0.045]'
          : 'border-white/12 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(255,255,255,0.035),transparent_65%),rgba(255,255,255,0.01)] hover:border-white/24 hover:bg-white/[0.025]'
      }`}
      tabIndex={0}
      role="button"
      aria-label="Drop files to encrypt and upload"
      onClick={onBrowse}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onBrowse();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDrag(true);
      }}
      onDragLeave={() => onDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDrag(false);
        if (e.dataTransfer.files?.length) onDropFiles(e.dataTransfer.files);
      }}
    >
      <span
        className={`mb-1 block border border-white/18 bg-[linear-gradient(90deg,transparent_47%,rgba(255,255,255,0.18)_47%_53%,transparent_53%),linear-gradient(0deg,transparent_47%,rgba(255,255,255,0.18)_47%_53%,transparent_53%)] opacity-55 ${
          compact ? 'h-5 w-5 shrink-0' : 'h-7 w-7'
        }`}
        aria-hidden="true"
      />
      <span className="text-[0.94rem] font-normal text-white/88 max-[560px]:text-[0.9rem]">{title}</span>
      <span className="text-[0.75rem] text-white/45 max-[560px]:text-[0.72rem]">
        <span className="hidden max-[560px]:inline">Tap to choose files · encrypted before upload</span>
        <span className="max-[560px]:hidden">{detail}</span>
      </span>
    </div>
  );
}
