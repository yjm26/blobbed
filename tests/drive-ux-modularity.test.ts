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
