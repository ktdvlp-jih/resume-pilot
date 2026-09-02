import { test, expect } from '@playwright/test';

test.describe('user journey', () => {
  test('signup → experience → workspace', async ({ page, request }) => {
    const stamp = Date.now();
    const email = `e2e-${stamp}@resumepilot.test`;
    const password = 'password123';
    const name = `E2E ${stamp}`;

    await page.goto('/signup');
    await page.locator('#name').fill(name);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('form input[type="checkbox"]').nth(0).check();
    await page.locator('form input[type="checkbox"]').nth(1).check();
    await page.locator('form button[type="submit"]').click();

    // bypass 환경: 바로 온보딩 / 운영: 이메일 인증 안내 후 force-verify
    const reachedOnboarding = await page
      .waitForURL(/\/onboarding/, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (!reachedOnboarding) {
      await expect(page.getByText(/이메일을 확인|Check your email/i)).toBeVisible({ timeout: 15_000 });
      const internal = process.env.INTERNAL_API_TOKEN?.trim();
      if (!internal) {
        throw new Error(
          'signup requires email verification but INTERNAL_API_TOKEN is not set for E2E force-verify',
        );
      }
      const verifyRes = await request.post('/api/v1/internal/auth/force-verify-email', {
        headers: { 'X-Internal-Token': internal },
        data: { email },
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok() || !verifyBody.success || !verifyBody.data?.accessToken) {
        throw new Error(`force-verify failed: ${verifyRes.status()} ${JSON.stringify(verifyBody)}`);
      }
      await page.evaluate(
        ({ accessToken, refreshToken, userId }: { accessToken: string; refreshToken: string; userId: string }) => {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          if (userId) localStorage.setItem('userId', userId);
        },
        {
          accessToken: verifyBody.data.accessToken as string,
          refreshToken: (verifyBody.data.refreshToken as string) || 'e2e-refresh-token',
          userId: String(verifyBody.data.userId ?? ''),
        },
      );
      await page.goto('/onboarding');
    }

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await page.getByRole('button', { name: /Later|나중에/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // 신규 계정 null 크래시 회귀 — 경력기술서·설정(잔액) 첫 방문
    await page.goto('/portfolio');
    await expect(page.getByTestId('portfolio-page')).toBeVisible({ timeout: 15_000 });

    await page.goto('/settings?tab=wallet');
    await expect(page.getByTestId('settings-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('billing-panel')).toBeVisible({ timeout: 15_000 });

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
