import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Aegis brand assets', () => {
  it('ships icon and horizontal logo assets for the UI', () => {
    expect(existsSync(join(root, 'public/brand/aegis-icon.png'))).toBe(true);
    expect(existsSync(join(root, 'public/brand/aegis-horizontal.png'))).toBe(true);
    expect(existsSync(join(root, 'public/brand/favicon.png'))).toBe(true);
  });

  it('uses the colon title format requested for the browser tab', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    expect(html).toContain('<title>Aegis: Your files. Truly yours.</title>');
    expect(html).not.toContain('Aegis —');
  });

  it('uses the real Aegis logo for boot error retry state', () => {
    const bootError = readFileSync(
      join(root, 'src/components/feature/drive/DriveBootError.tsx'),
      'utf8'
    );
    expect(bootError).toContain("import AegisLogo from '../../shared/AegisLogo'");
    expect(bootError).toContain('brand-loader-mark--logo');
    expect(bootError).toContain('variant="icon"');
    expect(bootError).not.toContain('brand-loader-ring');
    expect(bootError).not.toContain('brand-loader-core');
  });

  it('keeps wallet connect errors in branded gate UI', () => {
    const gatePage = readFileSync(join(root, 'src/pages/GatePage.tsx'), 'utf8');
    expect(gatePage).toContain('gate-error-card');
    expect(gatePage).toContain('Wallet connection failed');
  });
});
