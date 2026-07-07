import { test, expect } from '@playwright/test';

test.describe('public smoke', () => {
  test('landing page loads', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/ResumePilot/i);
  });

  test('admin SPA loads', async ({ page }) => {
    const res = await page.goto('/admin/');
    expect(res?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('swagger UI loads', async ({ page }) => {
    const res = await page.goto('/swagger-ui.html');
    expect(res?.status()).toBe(200);
  });

  test('API health via swagger', async ({ request }) => {
    const res = await request.get('/swagger-ui.html');
    expect(res.status()).toBe(200);
  });
});
