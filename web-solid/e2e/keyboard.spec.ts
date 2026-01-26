import { test, expect } from '@playwright/test';

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[class*="app"]');
  });

  test('w key switches to operational view', async ({ page }) => {
    // First switch to planning
    await page.keyboard.press('p');
    await expect(page.getByRole('button', { name: /Plans/i })).toHaveClass(/active/);

    // Now press w to switch to operational
    await page.keyboard.press('w');
    await expect(page.getByRole('button', { name: /Worktrees/i })).toHaveClass(/active/);
  });

  test('p key switches to planning view', async ({ page }) => {
    await page.keyboard.press('p');
    await expect(page.getByRole('button', { name: /Plans/i })).toHaveClass(/active/);
  });

  test('0 key focuses project list', async ({ page }) => {
    await page.keyboard.press('0');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-panel'));
    expect(focused).toBe('project-list');
  });

  test('1 key focuses main table', async ({ page }) => {
    await page.keyboard.press('1');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-panel'));
    expect(focused).toBe('worktree-table');
  });

  test('2 key focuses details panel', async ({ page }) => {
    await page.keyboard.press('2');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-panel'));
    expect(focused).toBe('details');
  });

  test('? key opens help modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
  });

  test('Escape closes help modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible();
  });
});
