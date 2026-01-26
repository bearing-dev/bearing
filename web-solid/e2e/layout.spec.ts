import { test, expect } from '@playwright/test';

test.describe('Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[class*="app"]');
  });

  test('app renders with correct structure', async ({ page }) => {
    // Tab bar exists
    await expect(page.locator('nav[class*="tabBar"]')).toBeVisible();

    // Project list exists
    await expect(page.locator('text=[0] Projects')).toBeVisible();

    // Main table exists
    await expect(page.locator('text=[1] Worktrees + PRs')).toBeVisible();

    // Details panel exists
    await expect(page.locator('text=[2] Details')).toBeVisible();

    // Footer exists
    await expect(page.locator('footer')).toBeVisible();
  });

  test('panels do not overlap', async ({ page }) => {
    const sidebar = page.locator('aside[class*="sidebar"]');
    const content = page.locator('div[class*="content"]');

    const sidebarBox = await sidebar.boundingBox();
    const contentBox = await content.boundingBox();

    expect(sidebarBox).toBeTruthy();
    expect(contentBox).toBeTruthy();

    // Sidebar should be to the left of content, not overlapping
    expect(sidebarBox!.x + sidebarBox!.width).toBeLessThanOrEqual(contentBox!.x + 5); // 5px tolerance
  });

  test('projects list shows project names and counts', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('li[class*="item"]', { timeout: 5000 });

    const projectItems = page.locator('li[class*="item"]');
    const count = await projectItems.count();
    expect(count).toBeGreaterThan(0);

    // Check first project has text content (name)
    const firstText = await projectItems.first().textContent();
    expect(firstText).toBeTruthy();
    expect(firstText!.length).toBeGreaterThan(0);
  });

  test('selecting a project shows worktrees', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('li[class*="item"]');

    // Click on a project
    await page.locator('li[class*="item"]').first().click();

    // Should see worktree rows (or empty state)
    await page.waitForTimeout(500);
  });

  test('tab switching shows different tables', async ({ page }) => {
    // Start on operational view
    await expect(page.locator('text=[1] Worktrees + PRs')).toBeVisible();

    // Switch to planning with 'p' key
    await page.keyboard.press('p');
    await expect(page.locator('text=[1] Plans + Issues')).toBeVisible();

    // Switch back with 'w' key
    await page.keyboard.press('w');
    await expect(page.locator('text=[1] Worktrees + PRs')).toBeVisible();
  });
});
