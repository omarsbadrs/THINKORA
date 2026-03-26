import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should load the dashboard page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should display the page description', async ({ page }) => {
    await expect(page.locator('text=Real-time overview')).toBeVisible();
  });

  test('should display overview cards', async ({ page }) => {
    // Overview cards with key metrics
    await expect(page.locator('text=Total Requests')).toBeVisible();
    await expect(page.locator('text=Total Tokens')).toBeVisible();
    await expect(page.locator('text=Total Cost')).toBeVisible();
    await expect(page.locator('text=Avg Latency')).toBeVisible();
    await expect(page.locator('text=Error Rate')).toBeVisible();
    await expect(page.locator('text=Top Models')).toBeVisible();
  });

  test('should show metric values in overview cards', async ({ page }) => {
    await expect(page.locator('text=12,847')).toBeVisible();
    await expect(page.locator('text=3.2 M')).toBeVisible();
    await expect(page.locator('text=$127.40')).toBeVisible();
    await expect(page.locator('text=320 ms')).toBeVisible();
  });

  test('should display tab navigation', async ({ page }) => {
    const tabs = ['Overview', 'Models', 'Logs', 'Costs', 'Errors', 'Connectors', 'Jobs'];

    for (const tab of tabs) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('should have Overview tab active by default', async ({ page }) => {
    const overviewTab = page.locator('button:has-text("Overview")');
    await expect(overviewTab).toHaveClass(/active/);
  });

  test('should switch tabs when clicking', async ({ page }) => {
    // Click on Models tab
    await page.locator('button:has-text("Models")').click();

    // The Models tab should now be active
    const modelsTab = page.locator('button:has-text("Models")');
    await expect(modelsTab).toHaveClass(/active/);

    // Overview cards should no longer be visible
    await expect(page.locator('text=Total Requests')).not.toBeVisible();
  });

  test('should show placeholder for non-Overview tabs', async ({ page }) => {
    await page.locator('button:has-text("Logs")').click();

    await expect(page.locator('text=coming soon')).toBeVisible();
  });

  test('should be able to navigate back to Overview tab', async ({ page }) => {
    // Switch away from Overview
    await page.locator('button:has-text("Costs")').click();
    await expect(page.locator('text=coming soon')).toBeVisible();

    // Switch back to Overview
    await page.locator('button:has-text("Overview")').click();
    await expect(page.locator('text=Total Requests')).toBeVisible();
  });

  test('should display sub-text on overview cards', async ({ page }) => {
    // Sub-text examples from the demo data
    await expect(page.locator('text=Last 30 days')).toBeVisible();
    await expect(page.locator('text=68 %')).toBeVisible();
  });

  test('should render 6 overview cards', async ({ page }) => {
    const cards = page.locator('.dash-card');
    await expect(cards).toHaveCount(6);
  });
});
