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
});
