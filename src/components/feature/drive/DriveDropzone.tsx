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
      className={`app-drop ${compact ? 'app-drop-compact' : ''} ${dragging ? 'is-drag' : ''}`}
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
      <span className="app-drop-mark" aria-hidden="true" />
      <span className="app-drop-title">{title}</span>
      <span className="app-drop-hint">{detail}</span>
    </div>
  );
}
