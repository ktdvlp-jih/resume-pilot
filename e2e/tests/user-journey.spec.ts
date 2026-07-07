import { test, expect } from '@playwright/test';

test.describe('user journey', () => {
  test('signup → experience → workspace', async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e-${stamp}@resumepilot.test`;
    const password = 'password123';
    const name = `E2E ${stamp}`;

    await page.goto('/signup');
    await page.locator('#name').fill(name);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto('/experiences');
    const addBtn = page.getByTestId('experience-add-btn').or(
      page.getByRole('button', { name: /경험 추가|Add experience|経験を追加|添加经历/i }),
    );
    await addBtn.first().click();

    const titleInput = page.getByTestId('experience-title-input').or(page.locator('form input[required]').first());
    await titleInput.fill(`E2E Project ${stamp}`);

    const descInput = page
      .getByTestId('experience-description-input')
      .or(page.locator('form textarea').first());
    await descInput.fill('Automated E2E test experience.');

    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(`E2E Project ${stamp}`)).toBeVisible({ timeout: 10_000 });

    await page.goto('/workspace');
    const workspaceRoot = page.getByTestId('workspace-page').or(page.getByRole('heading', { name: /워크스페이스|Workspace|ワークスペース|工作区/i }));
    await expect(workspaceRoot.first()).toBeVisible();

    const jobInput = page.getByTestId('workspace-job-input').or(page.locator('textarea').first());
    await jobInput.fill('Backend engineer position. Java, Spring Boot, PostgreSQL.');

    const autosave = page.getByTestId('workspace-page').getByTestId('workspace-autosave');
    if (await autosave.count()) {
      await expect(autosave.first()).toContainText(/저장|Saved|保存|已保存/i, { timeout: 5_000 });
    }
  });
});
