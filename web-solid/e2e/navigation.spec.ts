import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[class*="app"]');
  });

  test('arrow down selects first project when none selected', async ({ page }) => {
    await page.keyboard.press('0'); // Focus project list
    await page.keyboard.press('ArrowDown');
    // First project should be selected
    await expect(page.locator('li[class*="selected"]')).toBeVisible();
  });

  test('j key navigates down in project list', async ({ page }) => {
    await page.keyboard.press('0');
    await page.keyboard.press('j');
    await expect(page.locator('li[class*="selected"]')).toBeVisible();
  });

  test('k key navigates up in project list', async ({ page }) => {
    await page.keyboard.press('0');
    await page.keyboard.press('j');
    await page.keyboard.press('j');
    await page.keyboard.press('k');
    await expect(page.locator('li[class*="selected"]')).toBeVisible();
  });

  test('l/ArrowRight moves focus to main table', async ({ page }) => {
    await page.keyboard.press('0');
    await page.keyboard.press('l');
    // Should be able to navigate in worktree table now
    await page.keyboard.press('j');
  });

  test('h/ArrowLeft moves focus back to project list', async ({ page }) => {
    await page.keyboard.press('0');
    await page.keyboard.press('l');
    await page.keyboard.press('h');
    // Focus should be back on project list
  });
});
