import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Blobbed')).toBeVisible();
  await expect(page.locator('text=Your files.')).toBeVisible();
  await expect(page.locator('text=Truly yours.')).toBeVisible();
});

test('drive page loads', async ({ page }) => {
  await page.goto('/pages/drive.html');
  await expect(page.locator('text=My Files')).toBeVisible();
  await expect(page.locator('text=No files yet')).toBeVisible();
});

test('download page shows invalid link for bad hash', async ({ page }) => {
  await page.goto('/pages/download.html');
  await expect(page.locator('text=Invalid link')).toBeVisible();
});

test('connect wallet button redirects', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Connect Wallet');
  await expect(page).toHaveURL(/.*drive\.html/);
});
