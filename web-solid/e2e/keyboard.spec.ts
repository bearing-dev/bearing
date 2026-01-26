import { test, expect } from '@playwright/test';

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[class*="app"]');
  });

  // Helper to check which view is active by looking at which tab has the active class
  async function getActiveTab(page: any) {
    const activeTab = page.locator('button[class*="active"]');
    return activeTab.textContent();
  }

  test('1 key switches to operational view', async ({ page }) => {
    // First switch to planning
    await page.keyboard.press('2');
    await expect(page.getByRole('button', { name: /Plans/i })).toHaveClass(/active/);

    // Now press 1 to switch to operational
    await page.keyboard.press('1');
    await expect(page.getByRole('button', { name: /Worktrees/i })).toHaveClass(/active/);
  });

  test('2 key switches to planning view', async ({ page }) => {
    await page.keyboard.press('2');
    await expect(page.getByRole('button', { name: /Plans/i })).toHaveClass(/active/);
  });

  test('w key switches to operational view', async ({ page }) => {
    // First go to planning
    await page.keyboard.press('p');
    await expect(page.getByRole('button', { name: /Plans/i })).toHaveClass(/active/);

    // Now press w
    await page.keyboard.press('w');
    await expect(page.getByRole('button', { name: /Worktrees/i })).toHaveClass(/active/);
  });

  test('p key switches to planning view', async ({ page }) => {
    // Ensure we start at operational
    await page.keyboard.press('1');
    await expect(page.getByRole('button', { name: /Worktrees/i })).toHaveClass(/active/);

    // Press p to switch to planning
    await page.keyboard.press('p');
    await expect(page.getByRole('button', { name: /Plans/i })).toHaveClass(/active/);
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
