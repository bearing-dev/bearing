// @ts-check
const { test, expect } = require('@playwright/test');

// Mock data for tests
const mockProjects = [
  { name: 'bearing', count: 3 },
  { name: 'sailkit', count: 2 },
  { name: 'surfdeeper', count: 1 },
];

const mockWorktrees = [
  { repo: 'bearing', folder: 'bearing', branch: 'main', base: true, dirty: false, unpushed: 0, prState: null },
  { repo: 'bearing', folder: 'bearing-feature-x', branch: 'feature-x', base: false, dirty: true, unpushed: 2, prState: 'OPEN' },
  { repo: 'bearing', folder: 'bearing-bugfix', branch: 'bugfix', base: false, dirty: false, unpushed: 0, prState: 'MERGED' },
  { repo: 'sailkit', folder: 'sailkit', branch: 'main', base: true, dirty: false, unpushed: 0, prState: null },
  { repo: 'sailkit', folder: 'sailkit-docs', branch: 'docs', base: false, dirty: true, unpushed: 1, prState: 'DRAFT' },
  { repo: 'surfdeeper', folder: 'surfdeeper', branch: 'main', base: true, dirty: false, unpushed: 0, prState: null },
];

const mockPlans = [
  { id: 'abc123', title: 'TUI improvements', project: 'bearing', status: 'active', issue: 42 },
];

test.describe('Navigation - Project Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API calls with mock data
    await page.route('**/api/projects', route => {
      route.fulfill({ json: mockProjects });
    });
    await page.route('**/api/worktrees', route => {
      route.fulfill({ json: mockWorktrees });
    });
    await page.route('**/api/plans', route => {
      route.fulfill({ json: mockPlans });
    });
    await page.route('**/api/events', route => {
      // SSE endpoint - just hang
      route.abort();
    });

    await page.goto('/');
    await page.waitForSelector('#project-list .list-item');
  });

  test('clicking a project selects it and updates worktree list', async ({ page }) => {
    // Click sailkit project
    await page.click('[data-project="sailkit"]');

    // Verify project is selected
    const selectedProject = page.locator('#project-list .list-item.selected');
    await expect(selectedProject).toHaveAttribute('data-project', 'sailkit');

    // Verify worktree list shows sailkit worktrees
    const worktreeRows = page.locator('#worktree-rows .table-row');
    await expect(worktreeRows).toHaveCount(2);

    // First row should be sailkit (base)
    await expect(worktreeRows.first()).toContainText('sailkit');
  });

  test('clicking a different project updates selection', async ({ page }) => {
    // First select surfdeeper
    await page.click('[data-project="surfdeeper"]');
    await expect(page.locator('#project-list .list-item.selected')).toHaveAttribute('data-project', 'surfdeeper');

    // Then select bearing
    await page.click('[data-project="bearing"]');
    await expect(page.locator('#project-list .list-item.selected')).toHaveAttribute('data-project', 'bearing');

    // Verify worktree count for bearing
    const worktreeRows = page.locator('#worktree-rows .table-row');
    await expect(worktreeRows).toHaveCount(3);
  });

  test('project selection persists in localStorage', async ({ page }) => {
    // Select sailkit
    await page.click('[data-project="sailkit"]');

    // Check localStorage
    const savedState = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('bearing-state') || '{}');
    });

    expect(savedState.selectedProject).toBe('sailkit');
  });
});

test.describe('Navigation - Worktree Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/projects', route => route.fulfill({ json: mockProjects }));
    await page.route('**/api/worktrees', route => route.fulfill({ json: mockWorktrees }));
    await page.route('**/api/plans', route => route.fulfill({ json: mockPlans }));
    await page.route('**/api/events', route => route.abort());

    await page.goto('/');
    await page.waitForSelector('#worktree-rows .table-row');
  });

  test('clicking a worktree selects it and updates details panel', async ({ page }) => {
    // Click second worktree row
    await page.click('#worktree-rows .table-row:nth-child(2)');

    // Verify row is selected
    const selectedRow = page.locator('#worktree-rows .table-row.selected');
    await expect(selectedRow).toHaveAttribute('data-index', '1');

    // Verify details panel shows worktree info
    const detailsContent = page.locator('#details-content');
    await expect(detailsContent).toContainText('Folder:');
  });

  test('worktree selection updates details with health info', async ({ page }) => {
    // Select a dirty worktree with unpushed commits
    await page.click('[data-project="bearing"]');
    await page.waitForSelector('#worktree-rows .table-row');

    // Find and click the dirty worktree
    const dirtyRow = page.locator('#worktree-rows .table-row', { hasText: 'feature-x' });
    await dirtyRow.click();

    // Check details panel shows health info
    const detailsContent = page.locator('#details-content');
    await expect(detailsContent).toContainText('Health:');
    await expect(detailsContent).toContainText('Uncommitted');
  });

  test('worktree folder persists in localStorage', async ({ page }) => {
    // Click third row
    await page.click('#worktree-rows .table-row:nth-child(3)');

    const savedState = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('bearing-state') || '{}');
    });

    // The folder name is persisted (not the index) so selection survives sorting changes
    expect(savedState.selectedWorktreeFolder).toBeTruthy();
  });
});

test.describe('Navigation - Tab Views', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/projects', route => route.fulfill({ json: mockProjects }));
    await page.route('**/api/worktrees', route => route.fulfill({ json: mockWorktrees }));
    await page.route('**/api/plans', route => route.fulfill({ json: mockPlans }));
    await page.route('**/api/events', route => route.abort());

    await page.goto('/');
  });

  test('clicking tab changes active view', async ({ page }) => {
    // Click Planning tab
    await page.click('.tab[data-view="planning"]');

    // Verify tab is active
    await expect(page.locator('.tab[data-view="planning"]')).toHaveClass(/active/);
    await expect(page.locator('.tab[data-view="operational"]')).not.toHaveClass(/active/);

    // Worktrees panel should be hidden, plans panel visible
    await expect(page.locator('#worktrees-panel')).toHaveClass(/hidden/);
    await expect(page.locator('#plans-panel')).not.toHaveClass(/hidden/);
  });

  test('switching back to operational shows worktrees', async ({ page }) => {
    // Go to planning
    await page.click('.tab[data-view="planning"]');
    await expect(page.locator('#worktrees-panel')).toHaveClass(/hidden/);

    // Go back to operational
    await page.click('.tab[data-view="operational"]');
    await expect(page.locator('#worktrees-panel')).not.toHaveClass(/hidden/);
    await expect(page.locator('#plans-panel')).toHaveClass(/hidden/);
  });

  test('current view persists in localStorage', async ({ page }) => {
    await page.click('.tab[data-view="planning"]');

    const savedState = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('bearing-state') || '{}');
    });

    expect(savedState.currentView).toBe('planning');
  });
});

test.describe('Navigation - Persistence on Reload', () => {
  test('selected project survives page reload', async ({ page }) => {
    await page.route('**/api/projects', route => route.fulfill({ json: mockProjects }));
    await page.route('**/api/worktrees', route => route.fulfill({ json: mockWorktrees }));
    await page.route('**/api/plans', route => route.fulfill({ json: mockPlans }));
    await page.route('**/api/events', route => route.abort());

    await page.goto('/');
    await page.waitForSelector('#project-list .list-item');

    // Select sailkit
    await page.click('[data-project="sailkit"]');
    await expect(page.locator('#project-list .list-item.selected')).toHaveAttribute('data-project', 'sailkit');

    // Reload page
    await page.reload();
    await page.waitForSelector('#project-list .list-item');

    // Verify sailkit is still selected
    await expect(page.locator('#project-list .list-item.selected')).toHaveAttribute('data-project', 'sailkit');
  });

  test('current view survives page reload', async ({ page }) => {
    await page.route('**/api/projects', route => route.fulfill({ json: mockProjects }));
    await page.route('**/api/worktrees', route => route.fulfill({ json: mockWorktrees }));
    await page.route('**/api/plans', route => route.fulfill({ json: mockPlans }));
    await page.route('**/api/events', route => route.abort());

    await page.goto('/');

    // Switch to Planning view
    await page.click('.tab[data-view="planning"]');
    await expect(page.locator('.tab[data-view="planning"]')).toHaveClass(/active/);

    // Reload
    await page.reload();

    // Planning should still be active
    await expect(page.locator('.tab[data-view="planning"]')).toHaveClass(/active/);
  });
});
