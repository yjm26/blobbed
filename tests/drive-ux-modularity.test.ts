import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Tailwind migration guardrails', () => {
  it('uses Tailwind as the landing styling path instead of keeping landing vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const landingFiles = [
      'src/Landing.tsx',
      'src/components/landing/LandingSections.tsx',
      'src/components/landing/ChapterSection.tsx',
      'src/components/landing/SectionSeparator.tsx',
    ].map(read).join('\n');

    expect(landingFiles).toMatch(/\bmin-h-\[|\bgrid\b|\bborder-\[/);
    for (const selector of [
      '.landing-nav',
      '.landing-hero',
      '.hero-title',
      '.hero-desc',
      '.hero-cta',
      '.cta-primary',
      '.cta-secondary',
      '.landing-after-hero',
      '.landing-chapter',
      '.landing-section-separator',
      '.landing-cell',
      '.landing-process-card',
      '.landing-faq-row',
      '.landing-close-panel',
      '.landing-footer',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('uses Tailwind as the Gate styling path instead of keeping gate vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const gate = read('src/pages/GatePage.tsx');

    expect(gate).toMatch(/\bmin-h-\[|\bgrid\b|\bborder-\[/);
    for (const selector of [
      '.gate-page',
      '.gate-bg',
      '.gate-orb',
      '.gate-back',
      '.gate-center',
      '.gate-login-icon',
      '.gate-sub',
      '.gate-cta',
      '.gate-hint',
      '.gate-error-card',
      '@keyframes gate-drift',
      '@keyframes gate-fade-up',
      '@keyframes gate-cta-pulse',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('uses Tailwind as the shared loader styling path instead of keeping brand-loader vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const loaderFiles = [
      'src/components/shared/BrandLoader.tsx',
      'src/components/feature/drive/DriveBootError.tsx',
      'src/components/feature/drive/DriveBootProgress.tsx',
    ].map(read).join('\n');

    expect(loaderFiles).toMatch(/\bfixed\b|\bgrid\b|\bborder-\[/);
    for (const selector of [
      '.brand-loader',
      '.brand-loader--overlay',
      '.brand-loader-ambient',
      '.brand-loader-inner',
      '.brand-loader-mark',
      '.brand-loader-icon',
      '.brand-loader-copy',
      '.brand-loader-label',
      '.brand-loader-hint',
      '.brand-loader-bar',
      '.brand-loader-boot-bar',
      '.brand-loader-actions',
      '@keyframes brand-bar-slide',
      '@keyframes brand-loader-in',
      '@keyframes brand-mark-enter',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('uses Tailwind as the media lightbox styling path instead of keeping lightbox vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const lightbox = read('src/components/feature/media/MediaLightbox.tsx');

    expect(lightbox).toMatch(/\bfixed\b|\bgrid\b|\bborder-\[/);
    for (const selector of [
      '.media-lightbox',
      '.media-lightbox-chrome',
      '.media-lightbox-name',
      '.media-lightbox-close',
      '.media-lightbox-stage',
      '.media-lightbox-media',
      '.media-lightbox-video',
      '.media-lightbox-status',
      '.media-lightbox-spinner',
      '.media-lightbox-progress',
      '.media-lightbox-progress-fill',
      '.media-lightbox-tool',
      '.media-lightbox-idx',
      '.media-lightbox-nav',
      '.media-lightbox-hint',
      '.lightbox',
      '.lightbox-close',
      '.lightbox-body',
      '.lightbox-cap',
      '.download-preview-img',
      '.download-preview-video',
      '.preview-loading',
      '.preview-error',
      '@keyframes media-lightbox-in',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('uses Tailwind as the shared view gallery styling path instead of keeping view vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const view = read('src/pages/ViewPage.tsx');

    expect(view).toMatch(/\bgrid\b|\bborder-\[/);
    for (const selector of [
      '.view-page .view-main',
      '.view-head',
      '.view-kicker',
      '.view-title',
      '.view-meta',
      '.view-sub',
      '.view-error',
      '.view-grid',
      '.view-tile',
      '.view-tile-media',
      '.view-tile-ph',
      '.view-tile-badge',
      '.view-tile-foot',
      '.view-tile-copy',
      '.view-tile-name',
      '.view-tile-kind',
      '.view-dl',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('makes the live share view feel like a proper product page', () => {
    const view = read('src/pages/ViewPage.tsx');

    expect(view).toContain('!w-[clamp(7.25rem,9vw,9rem)]');
    expect(view).toContain('Secure share');
    expect(view).toContain('Browser decrypted');
    expect(view).toContain('totalSize');
    expect(view).toContain('fileTypeSummary');
    expect(view).toContain('Files decrypt in your browser');
    expect(view).toContain('URL fragment');
    expect(view).toContain('Search files');
    expect(view).toContain('Type filter');
    expect(view).toContain('Sort files');
    expect(view).toContain("viewMode === 'grid'");
    expect(view).toContain("setViewMode('list')");
    expect(view).toContain('Showing');
    expect(view).toContain('formatShareSize');
    expect(view).toContain('Preview unavailable');
    expect(view).toContain('Download still works');
    expect(view).toContain('Loading preview…');
    expect(view).toContain('oklch(0.34_0.05_190');
    expect(view).toContain('max-w-[76rem]');
  });

  it('uses inline share download status instead of native browser dialogs', () => {
    const sourceFiles = [
      'src/pages/ViewPage.tsx',
      'src/pages/DownloadPage.tsx',
      'src/pages/DrivePage.tsx',
      'src/components/feature/share/ShareSheet.tsx',
    ].map(read).join('\n');
    const view = read('src/pages/ViewPage.tsx');

    expect(sourceFiles).not.toMatch(/\b(alert|prompt|confirm)\(/);
    expect(view).toContain('downloadStatus');
    expect(view).toContain('setDownloadStatus');
    expect(view).toContain('handleDownload');
    expect(view).toContain('Preparing download…');
    expect(view).toContain('Download started');
    expect(view).toContain('Download failed');
  });

  it('makes the legacy download route feel like a secure product page', () => {
    const download = read('src/pages/DownloadPage.tsx');

    expect(download).toContain('Secure download');
    expect(download).toContain('Browser decrypted');
    expect(download).toContain('Encrypted blob download');
    expect(download).toContain('The file key stays in the URL fragment');
    expect(download).toContain('Preparing download…');
    expect(download).toContain('Downloading encrypted blob…');
    expect(download).toContain('Download ready');
    expect(download).toContain('Open secure preview');
    expect(download).toContain('oklch(0.34_0.05_190');
    expect(download).toContain('max-w-[34rem]');
  });

  it('keeps invalid or empty share views from showing dead file controls', () => {
    const view = read('src/pages/ViewPage.tsx');

    expect(view).toContain('canShowFileControls');
    expect(view).toContain('showEmptyShareState');
    expect(view).toContain('{canShowFileControls ? (');
    expect(view).toContain('No usable files in this share');
    expect(view).toContain('Check the link or ask the owner to share again.');
    expect(view).toContain('Back to Aegis');
    expect(view).toContain('No files match this filter.');
  });

  it('uses plain-language invalid share link recovery copy', () => {
    const view = read('src/pages/ViewPage.tsx');

    expect(view).toContain('This link is missing its private share key.');
    expect(view).toContain('Open the full link, including everything after #.');
    expect(view).toContain('Ask the owner to send the complete share link again.');
    expect(view).not.toContain('No share payload in URL.');
    expect(view).not.toContain('missing or corrupted');
  });

  it('uses Tailwind as the filter menu styling path instead of keeping filter vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const filter = read('src/components/shared/FilterMenu.tsx');

    expect(filter).toMatch(/\brelative\b|\brounded-\b|\bborder-\[/);
    for (const selector of [
      '.filter-menu',
      '.filter-menu-trigger',
      '.filter-menu-dot',
      '.filter-menu-chevron',
      '.filter-menu-panel',
      '.filter-menu-label',
      '.filter-menu-search',
      '.filter-menu-chips',
      '.filter-chip',
      '.filter-menu-foot',
      '.filter-menu-count',
      '.filter-menu-clear',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('keeps app chrome transitions smooth without restoring vanilla CSS', () => {
    const drive = read('src/pages/DrivePage.tsx');
    const pageTransition = read('src/components/shared/PageTransition.tsx');

    expect(drive).toContain('MODAL_VISIBLE_BACKDROP_CLASS');
    expect(drive).toContain('MODAL_VISIBLE_CARD_CLASS');
    expect(drive).toMatch(/transition-\[opacity,transform\]/);
    expect(drive).toMatch(/scale-9[58]|translate-y-2/);
    expect(pageTransition).toContain('requestAnimationFrame');
    expect(pageTransition).toMatch(/duration-\[520ms\]|duration-500/);
    expect(pageTransition).toContain('ease-[cubic-bezier(0.16,1,0.3,1)]');
  });

  it('keeps tailwind.css limited to Tailwind imports and global base styles after the migration', () => {
    const style = read('src/tailwind.css');
    const appFiles = [
      'src/pages/DrivePage.tsx',
      'src/components/feature/drive/DriveBulkBar.tsx',
      'src/components/shared/PageTransition.tsx',
      'src/App.tsx',
    ].map(read).join('\n');

    expect(appFiles).toMatch(/\bfixed\b|\bmin-h-\[|\bsr-only\b/);
    for (const selector of [
      '.app-modal',
      '.app-modal-backdrop',
      '.app-modal-title',
      '.app-modal-sub',
      '.app-modal-em',
      '.app-modal-label',
      '.app-modal-input',
      '.app-modal-actions',
      '.app-modal-btn',
      '.page-shell',
      '.drive-bulk-bar',
      '.drive-bulk-count',
      '.drive-bulk-actions',
      '.drive-bulk-select',
      '.app-file-check',
      '.app-fatal',
      '.app-fatal-card',
      '.app-fatal-title',
      '.app-fatal-pre',
      '.app-fatal-hint',
      '@keyframes app-modal-fade',
      '@keyframes app-modal-pop',
      '@keyframes page-enter',
    ]) {
      expect(style).not.toContain(selector);
    }
    expect(style).not.toMatch(/^\.[\w-]+/m);
  });

  it('uses Tailwind as the upload/share overlay styling path instead of keeping upload/share vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const overlayFiles = [
      'src/components/feature/upload/UploadQueuePanel.tsx',
      'src/components/feature/share/ShareSheet.tsx',
    ].map(read).join('\n');

    expect(overlayFiles).toMatch(/\bfixed\b|\brounded-\b|\bborder-\[/);
    for (const selector of [
      '.upload-queue',
      '.upload-queue-head',
      '.upload-queue-title',
      '.upload-queue-dot',
      '.upload-queue-count',
      '.upload-queue-list',
      '.upload-queue-item',
      '.upload-queue-name',
      '.upload-queue-sub',
      '.upload-queue-error',
      '.upload-queue-bar',
      '.upload-queue-bar-fill',
      '.share-sheet',
      '.share-sheet-kicker',
      '.share-sheet-badge-row',
      '.share-sheet-row',
      '.share-sheet-input',
      '.share-sheet-notes',
      '.share-sheet-err',
      '.share-sheet-ok',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('uses clear trust-building upload progress language', () => {
    const queueHook = read('src/components/hooks/useQueue.ts');
    const queuePanel = read('src/components/feature/upload/UploadQueuePanel.tsx');
    const uploadUi = `${queueHook}\n${queuePanel}`;

    expect(queueHook).toContain('uploadPhaseLabel');
    for (const copy of [
      'Preparing file',
      'Encrypting locally',
      'Uploading encrypted blob',
      'Saving library metadata',
      'Done',
    ]) {
      expect(uploadUi).toContain(copy);
    }
    expect(queuePanel).not.toContain('Encrypting & uploading');
    expect(queueHook).not.toContain("phase: 'Starting'");
    expect(queueHook).toContain('onStatus({ msg: phase');
  });

  it('uses Tailwind as the trust panel styling path instead of keeping trust/vault vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const trust = read('src/components/shared/TrustPanel.tsx');

    expect(trust).toContain('rounded-');
    expect(trust).toContain('border-');
    for (const selector of [
      '.trust-strip',
      '.trust-dot',
      '.trust-action',
      '.trust-panel',
      '.trust-panel--drive',
      '.trust-panel--gate',
      '.trust-panel--share',
      '.trust-panel--landing',
      '.trust-lead',
      '.trust-list',
      '.trust-banner',
      '.vault-chip',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('uses Tailwind as the app shell styling path instead of keeping core app chrome vanilla CSS blocks', () => {
    const style = read('src/tailwind.css');
    const shellFiles = [
      'src/pages/DrivePage.tsx',
      'src/pages/ViewPage.tsx',
      'src/pages/DownloadPage.tsx',
      'src/components/layout/DriveTopBar.tsx',
      'src/components/layout/DriveLayout.tsx',
      'src/components/feature/drive/DriveHeader.tsx',
    ].map(read).join('\n');

    expect(shellFiles).toMatch(/\bmin-h-\[|\bgrid\b|\bborder-\[/);
    for (const selector of [
      '.app-page',
      '.app-top',
      '.app-brand',
      '.app-top-right',
      '.wallet-chip',
      '.app-link',
      '.app-shell',
      '.app-rail',
      '.app-upload-cta',
      '.app-rail-nav',
      '.app-rail-label',
      '.app-rail-item',
      '.app-rail-foot',
      '.app-stage',
      '.app-stage-head',
      '.app-stage-title',
      '.app-stage-sub',
      '.app-back',
      '.app-folder-nav',
      '.app-rail-count',
    ]) {
      expect(style).not.toContain(selector);
    }
  });

  it('uses Tailwind as the Drive styling path instead of adding vanilla CSS blocks', () => {
    const main = read('src/main.tsx');
    const style = read('src/tailwind.css');
    const vite = read('vite.config.ts');
    const pkg = read('package.json');
    const modules = [
      'src/components/feature/drive/DriveDropzone.tsx',
      'src/components/feature/drive/DriveEmptyState.tsx',
      'src/components/feature/drive/DriveToolbar.tsx',
      'src/components/feature/drive/DriveActionMenu.tsx',
      'src/components/feature/drive/DriveFileList.tsx',
      'src/components/feature/drive/DriveFolderGrid.tsx',
    ].map(read).join('\n');

    expect(main).toContain("import './tailwind.css'");
    expect(existsSync(join(root, 'src/style.css'))).toBe(false);
    expect(existsSync(join(root, 'src/style.css.bak'))).toBe(false);
    expect(existsSync(join(root, 'src/style.css.broken'))).toBe(false);
    expect(style).toContain('@import "tailwindcss" important;');
    expect(vite).toContain('@tailwindcss/vite');
    expect(pkg).toContain('@tailwindcss/vite');
    expect(modules).toContain('className="');
    expect(modules).toMatch(/\bflex\b|\bgrid\b|\bborder\b|\bbg-\[/);
    expect(style).not.toContain('.drive-toolbar');
    expect(style).not.toContain('.drive-empty-state');
    expect(style).not.toContain('.drive-action-menu');
    expect(style).not.toContain('.drive-folder-card');
    expect(style).not.toContain('.app-file-grid');
    expect(style).not.toContain('.app-file-card');
    expect(style).not.toContain('.app-file-row');
  });

  it('keeps Drive UX split into focused feature modules', () => {
    const files = [
      'src/components/feature/drive/DriveEmptyState.tsx',
      'src/components/feature/drive/DriveActionMenu.tsx',
      'src/components/feature/drive/DriveToolbar.tsx',
      'src/components/feature/drive/driveFormat.ts',
    ];
    for (const file of files) expect(existsSync(join(root, file))).toBe(true);
  });

  it('keeps DrivePage as orchestration instead of action markup dump', () => {
    const page = read('src/pages/DrivePage.tsx');
    const header = read('src/components/feature/drive/DriveHeader.tsx');
    expect(page).toContain('DriveEmptyState');
    expect(header).toContain('DriveToolbar');
    expect(page).not.toContain('This folder is empty');
    expect(page).not.toContain('Your library is empty');
  });

  it('uses menu-based secondary file/folder actions', () => {
    const files = read('src/components/feature/drive/DriveFileList.tsx');
    const folders = read('src/components/feature/drive/DriveFolderGrid.tsx');
    expect(files).toContain('DriveActionMenu');
    expect(folders).toContain('DriveActionMenu');
    expect(files).not.toContain('>Rename<');
    expect(files).not.toContain('>Move<');
    expect(files).not.toContain('>Delete<');
  });

  it('keeps Drive folders and file selection polished on desktop and mobile', () => {
    const files = read('src/components/feature/drive/DriveFileList.tsx');
    const folders = read('src/components/feature/drive/DriveFolderGrid.tsx');

    expect(folders).not.toContain('auto-fit');
    expect(folders).toMatch(/auto-fill|minmax\(min\(100%,14rem\),16rem\)/);
    expect(folders).toContain('aspect-[4/3]');
    expect(folders).toContain('max-[560px]:grid-cols-1');

    expect(files).toContain('SELECT_CHECK_CLASS');
    expect(files).toContain('absolute left-3 top-3');
    expect(files).toContain('appearance-none');
    expect(files).toContain('peer-checked');
    expect(files).toContain('minmax(min(100%,11.5rem),1fr)');
    expect(files).toContain('max-[560px]:grid-cols-1');
  });

  it('keeps folder card actions inside the card with subtle landing palette color', () => {
    const folders = read('src/components/feature/drive/DriveFolderGrid.tsx');
    const actionMenu = read('src/components/feature/drive/DriveActionMenu.tsx');

    expect(actionMenu).toContain('iconOnly');
    expect(actionMenu).toContain('⋯');
    expect(actionMenu).toContain('aria-label={label}');
    expect(folders).toContain('absolute right-3 top-3 z-20');
    expect(folders).toContain('label="Folder actions"');
    expect(folders).toContain('iconOnly');
    expect(folders).not.toContain('label="More"');
    expect(folders).toContain('oklch(0.34_0.05_190');
    expect(folders).toContain('oklch(0.32_0.035_250');
    expect(folders).toContain('text-[oklch(0.86_0.045_190)]');
  });

  it('keeps Drive hierarchy obvious with breadcrumb, sections, and visible search', () => {
    const page = read('src/pages/DrivePage.tsx');
    const header = read('src/components/feature/drive/DriveHeader.tsx');
    const index = read('src/components/feature/drive/index.ts');
    const breadcrumb = read('src/components/feature/drive/DriveBreadcrumb.tsx');
    const sectionHeader = read('src/components/feature/drive/DriveSectionHeader.tsx');
    const filesToolbar = read('src/components/feature/drive/FilesToolbar.tsx');

    expect(existsSync(join(root, 'src/style.css'))).toBe(false);
    expect(index).toContain('DriveBreadcrumb');
    expect(index).toContain('DriveSectionHeader');
    expect(index).toContain('FilesToolbar');
    expect(header).toContain('DriveBreadcrumb');
    expect(breadcrumb).toContain('Library');
    expect(breadcrumb).toContain('All files');
    expect(sectionHeader).toContain('aria-level={2}');
    expect(filesToolbar).toContain('Search files and folders');
    expect(filesToolbar).toContain('Select all');
    expect(filesToolbar).toContain('Clear selection');
    expect(filesToolbar).toContain('max-[560px]:');
    expect(page).toContain('<DriveSectionHeader');
    expect(page).toContain('<FilesToolbar');
  });

  it('uses plain-language security copy in the Drive app chrome', () => {
    const page = read('src/pages/DrivePage.tsx');
    const trust = read('src/components/shared/TrustPanel.tsx');
    const topbar = read('src/components/layout/DriveTopBar.tsx');
    const driveChrome = [page, trust, topbar].join('\n');

    expect(topbar).toContain('Encryption active');
    expect(topbar).toContain('Unlock encryption');
    expect(topbar).toContain('Files encrypt on this device before upload');
    expect(trust).toContain('Private vault unlocked');
    expect(trust).toContain('Library synced');
    expect(page).toContain('Files encrypt on this device before upload');
    expect(page).toContain('protected key');

    for (const staleCopy of [
      'Keys wrapped',
      'Vault unlocked',
      'Vault locked',
      'meta:',
      'Library on Neon',
      'Unlock keys. Check wallet',
    ]) {
      expect(driveChrome).not.toContain(staleCopy);
    }
  });

  it('keeps Drive command controls mobile-friendly', () => {
    const topbar = read('src/components/layout/DriveTopBar.tsx');
    const toolbar = read('src/components/feature/drive/DriveToolbar.tsx');
    const filesToolbar = read('src/components/feature/drive/FilesToolbar.tsx');
    const bulkBar = read('src/components/feature/drive/DriveBulkBar.tsx');

    expect(topbar).toContain('max-[560px]:flex-col');
    expect(topbar).toContain('max-[560px]:w-full');
    expect(topbar).toContain('max-[560px]:justify-between');
    expect(toolbar).toContain('max-[560px]:grid');
    expect(toolbar).toContain('max-[560px]:grid-cols-2');
    expect(toolbar).toContain('max-[560px]:min-h-11');
    expect(filesToolbar).toContain('max-[560px]:min-h-11');
    expect(filesToolbar).toContain('max-[560px]:w-full');
    expect(bulkBar).toContain('max-[560px]:bottom-0');
    expect(bulkBar).toContain('max-[560px]:rounded-t-2xl');
    expect(bulkBar).toContain('max-[560px]:pb-[calc(env(safe-area-inset-bottom)+0.85rem)]');
  });

  it('avoids duplicate upload CTAs in empty folders', () => {
    const page = read('src/pages/DrivePage.tsx');

    expect(page).toContain('const shouldShowDropzone');
    expect(page).toContain('folderId ? files.length > 0 : true');
    expect(page).toContain('{shouldShowDropzone ? (');
    expect(page).not.toContain('<DriveDropzone\n          compact={files.length > 0}');
  });

  it('uses a desktop details panel instead of leaving Drive whitespace empty', () => {
    const page = read('src/pages/DrivePage.tsx');
    const index = read('src/components/feature/drive/index.ts');

    expect(existsSync(join(root, 'src/components/feature/drive/DriveDetailsPanel.tsx'))).toBe(true);
    const details = read('src/components/feature/drive/DriveDetailsPanel.tsx');

    expect(index).toContain('DriveDetailsPanel');
    expect(page).toContain('DriveDetailsPanel');
    expect(page).toContain('const selectedFiles');
    expect(page).toContain('const totalBytes');
    expect(page).toContain('hidden xl:block');
    expect(details).toContain('Security');
    expect(details).toContain('Storage');
    expect(details).toContain('Selected files');
    expect(details).toContain('Encryption active');
    expect(details).toContain('Blobs on Shelby');
  });

  it('makes the desktop details panel actionable for selected files', () => {
    const page = read('src/pages/DrivePage.tsx');
    const details = read('src/components/feature/drive/DriveDetailsPanel.tsx');

    for (const copy of [
      'Preview',
      'Share link',
      'Rename',
      'Move',
      'Remove',
      'Move selected',
      'Delete selected',
      'Clear selection',
    ]) {
      expect(details).toContain(copy);
    }

    expect(details).toContain('onPreview');
    expect(details).toContain('onShare');
    expect(details).toContain('onRename');
    expect(details).toContain('onMove');
    expect(details).toContain('onDelete');
    expect(details).toContain('onBulkMove');
    expect(details).toContain('onBulkDelete');
    expect(details).toContain('onClearSelection');
    expect(details).toContain('isImageMime');
    expect(details).toContain('isVideoMime');

    expect(page).toContain('onPreview={(id) => void onPreview(id)}');
    expect(page).toContain('onShare={(id) => void onShareFile(id)}');
    expect(page).toContain('onRename={askRenameFile}');
    expect(page).toContain('onMove={askMoveFile}');
    expect(page).toContain('onDelete={askDelete}');
    expect(page).toContain('onBulkDelete={() => void bulkDelete()}');
    expect(page).toContain('onBulkMove={(fid) => void bulkMove(fid)}');
    expect(page).toContain('onClearSelection={() => selection.clear()}');
  });

});
