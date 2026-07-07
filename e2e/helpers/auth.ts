import type { APIRequestContext, Page } from '@playwright/test';

export type TestUser = {
  email: string;
  password: string;
  name: string;
  token: string;
};

export async function signupViaApi(request: APIRequestContext, stamp: number): Promise<TestUser> {
  const email = `ai-e2e-${stamp}@resumepilot.test`;
  const password = 'password123';
  const name = `AI E2E ${stamp}`;

  const res = await request.post('/api/v1/auth/signup', {
    data: { email, password, name },
  });
  const body = await res.json();
  if (!res.ok() || !body.success) {
    throw new Error(`signup failed: ${res.status()} ${JSON.stringify(body)}`);
  }

  return { email, password, name, token: body.data.accessToken as string };
}

export async function seedAuthSession(page: Page, token: string) {
  await page.goto('/');
  await page.evaluate((accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', 'e2e-refresh-token');
  }, token);
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
