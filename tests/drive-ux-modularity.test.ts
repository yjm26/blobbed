import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Drive UX modularity', () => {
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
