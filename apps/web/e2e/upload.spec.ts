import { test, expect } from '@playwright/test';

test.describe('Files / Upload Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/files');
  });

  test('should load the files page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Files');
  });

  test('should display the page description', async ({ page }) => {
    await expect(page.locator('text=Upload documents')).toBeVisible();
  });

  test('should show the upload drop zone area', async ({ page }) => {
    // The drag-and-drop upload area should be visible
    const uploadArea = page.locator('text=Drag').first();
    await expect(uploadArea).toBeVisible();
  });

  test('should show browse link in upload area', async ({ page }) => {
    await expect(page.locator('text=browse')).toBeVisible();
  });

  test('should display file size limit information', async ({ page }) => {
    await expect(page.locator('text=25 MB')).toBeVisible();
  });

  test('should render the file list table', async ({ page }) => {
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should display table headers', async ({ page }) => {
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Size")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
  });

  test('should display demo files in the table', async ({ page }) => {
    // Demo files should be listed
    await expect(page.locator('text=product-roadmap.pdf')).toBeVisible();
    await expect(page.locator('text=meeting-notes-q1.md')).toBeVisible();
  });

  test('should show file status badges', async ({ page }) => {
    // Status badges for different file states
    await expect(page.locator('text=processed').first()).toBeVisible();
  });

  test('should display multiple file types', async ({ page }) => {
    await expect(page.locator('text=PDF')).toBeVisible();
    await expect(page.locator('text=Markdown')).toBeVisible();
  });

  test('should render at least 3 file entries', async ({ page }) => {
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(5); // 5 demo files
  });
});
