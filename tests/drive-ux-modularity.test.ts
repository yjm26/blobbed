import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Tailwind migration guardrails', () => {
  it('uses Tailwind as the landing styling path instead of keeping landing vanilla CSS blocks', () => {
    const style = read('src/style.css');
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
    const style = read('src/style.css');
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
    const style = read('src/style.css');
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
    const style = read('src/style.css');
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

  it('uses Tailwind as the upload/share overlay styling path instead of keeping upload/share vanilla CSS blocks', () => {
    const style = read('src/style.css');
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

  it('uses Tailwind as the trust panel styling path instead of keeping trust/vault vanilla CSS blocks', () => {
    const style = read('src/style.css');
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
    const style = read('src/style.css');
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
    const style = read('src/style.css');
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
});
