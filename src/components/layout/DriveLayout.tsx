import React from 'react';
import { Link } from 'react-router-dom';

interface DriveLayoutProps {
  children: React.ReactNode;
  folderName?: string;
  onNewFolder?: () => void;
  onUpload?: () => void;
  onRefresh?: () => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
}

export default function DriveLayout({
  children,
  folderName,
  onNewFolder,
  onUpload,
  onRefresh,
  onSearch,
  isLoading = false,
}: DriveLayoutProps) {
  return (
    <div className="app-page app-page--drive">
      {/* Top bar sudah dihandle MainLayout / AppNavbar biasanya */}
      <main className="app-shell">
        {/* Sidebar / Rail */}
        <aside className="app-rail app-reveal app-reveal-2">
          <button
            type="button"
            className="app-btn-ghost app-btn-block"
            onClick={onNewFolder}
          >
            New folder
          </button>

          <button
            type="button"
            className="app-upload-cta"
            onClick={onUpload}
          >
            Upload files
          </button>

          <nav className="app-rail-nav" aria-label="Library">
            <p className="app-rail-label">Library</p>

            <button
              type="button"
              className={`app-rail-item ${!folderName ? 'is-active' : ''}`}
              onClick={() => window.history.back()} // nanti diganti setFolderId(null)
            >
              All files
            </button>

            {/* Folder list akan di-inject lewat children atau context nanti */}
            <div className="app-folder-nav">
              {/* Placeholder — nanti diisi dari DrivePage */}
            </div>
          </nav>

          <p className="app-rail-foot">
            Encrypted on device. Blobs on Shelby.
          </p>
        </aside>

        {/* Main Stage */}
        <section className="app-stage app-reveal app-reveal-3">
          {children}
        </section>
      </main>
    </div>
  );
}
