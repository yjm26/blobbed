import React from 'react';

type Props = {
  scope: 'library' | 'folder' | 'filtered';
  onUpload: () => void;
  onNewFolder?: () => void;
  onClearFilters?: () => void;
};

export default function DriveEmptyState({
  scope,
  onUpload,
  onNewFolder,
  onClearFilters,
}: Props) {
  const copy =
    scope === 'filtered'
      ? {
          kicker: 'No matches',
          title: 'Nothing matches this view.',
          body: 'Try another search or clear filters.',
        }
      : scope === 'folder'
        ? {
            kicker: 'Empty folder',
            title: 'Drop files into this folder.',
            body: 'Files encrypt in your browser before they touch Shelby.',
          }
        : {
            kicker: 'Encrypted library',
            title: 'Start with an encrypted upload.',
            body: 'Create a folder or upload files. Aegis encrypts locally, then stores ciphertext on Shelby.',
          };

  return (
    <section className={`drive-empty-state drive-empty-state--${scope}`}>
      <p className="drive-empty-kicker">{copy.kicker}</p>
      <h2 className="drive-empty-title">{copy.title}</h2>
      <p className="drive-empty-body">{copy.body}</p>
      <div className="drive-empty-actions">
        {scope === 'filtered' ? (
          <button type="button" className="app-btn-ghost" onClick={onClearFilters}>
            Clear filters
          </button>
        ) : (
          <>
            {onNewFolder ? (
              <button type="button" className="app-btn-ghost" onClick={onNewFolder}>
                New folder
              </button>
            ) : null}
            <button type="button" className="app-upload-cta app-empty-cta" onClick={onUpload}>
              Upload files
            </button>
          </>
        )}
      </div>
    </section>
  );
}
