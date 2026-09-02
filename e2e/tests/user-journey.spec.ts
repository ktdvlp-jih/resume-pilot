import { test, expect } from '@playwright/test';
import { seedAuthSession } from '../helpers/auth';

type SignupApiBody = {
  success?: boolean;
  data?: {
    email?: string;
    requiresEmailVerification?: boolean;
    message?: string;
    tokens?: { accessToken?: string; refreshToken?: string; userId?: string } | null;
  };
  error?: { code?: string; message?: string };
};

test.describe('user journey', () => {
  test('signup → experience → workspace', async ({ page, request }) => {
    const stamp = Date.now();
    const email = `e2e-${stamp}@resumepilot.test`;
    const password = 'password123';
    const name = `E2E ${stamp}`;

    await page.goto('/signup');
    await expect(page.getByTestId('signup-form')).toBeVisible({ timeout: 15_000 });

    await page.locator('#name').fill(name);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);

    const checkboxes = page.getByTestId('signup-form').locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(2);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    const submit = page.getByTestId('signup-submit');
    await expect(submit).toBeEnabled();

    const signupWait = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/signup') && res.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await submit.click();
    const signupRes = await signupWait;
    const signupBody = (await signupRes.json()) as SignupApiBody;

    if (!signupRes.ok() || !signupBody.success || !signupBody.data) {
      const uiError = await page.getByTestId('signup-error').textContent().catch(() => '');
      throw new Error(
        `signup failed: HTTP ${signupRes.status()} body=${JSON.stringify(signupBody)} ui=${uiError}`,
      );
    }

    const data = signupBody.data;
    const accessFromSignup = data.tokens?.accessToken;

    if (accessFromSignup) {
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    } else if (data.requiresEmailVerification) {
      await expect(page.getByTestId('signup-check-email')).toBeVisible({ timeout: 15_000 });

      const internal = process.env.INTERNAL_API_TOKEN?.trim();
      if (!internal) {
        throw new Error(
          'signup requires email verification but INTERNAL_API_TOKEN is not set for E2E force-verify',
        );
      }
      const verifyRes = await request.post('/api/v1/internal/auth/force-verify-email', {
        headers: { 'X-Internal-Token': internal },
        data: { email: data.email || email },
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok() || !verifyBody.success || !verifyBody.data?.accessToken) {
        throw new Error(`force-verify failed: ${verifyRes.status()} ${JSON.stringify(verifyBody)}`);
      }

      await seedAuthSession(page, verifyBody.data.accessToken as string);
      await page.evaluate(
        ({ refreshToken, userId }: { refreshToken?: string; userId?: string }) => {
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          if (userId) localStorage.setItem('userId', userId);
        },
        {
          refreshToken: verifyBody.data.refreshToken as string | undefined,
          userId: verifyBody.data.userId != null ? String(verifyBody.data.userId) : undefined,
        },
      );
      await page.goto('/onboarding');
      await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    } else {
      throw new Error(`signup succeeded without tokens or verification flag: ${JSON.stringify(signupBody)}`);
    }

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
    const workspaceRoot = page
      .getByTestId('workspace-page')
      .or(page.getByRole('heading', { name: /워크스페이스|Workspace|ワークスペース|工作区/i }));
    await expect(workspaceRoot.first()).toBeVisible();

    const jobInput = page.getByTestId('workspace-job-input').or(page.locator('textarea').first());
    await jobInput.fill('Backend engineer position. Java, Spring Boot, PostgreSQL.');

    const autosave = page.getByTestId('workspace-page').getByTestId('workspace-autosave');
    if (await autosave.count()) {
      await expect(autosave.first()).toContainText(/저장|Saved|保存|已保存/i, { timeout: 5_000 });
    }
  });
});
