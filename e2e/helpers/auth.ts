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
    data: { email, password, name, termsAccepted: true, privacyAccepted: true },
  });
  const body = await res.json();
  if (!res.ok() || !body.success) {
    throw new Error(`signup failed: ${res.status()} ${JSON.stringify(body)}`);
  }

  const tokens = body.data?.tokens;
  let accessToken = tokens?.accessToken as string | undefined;

  // 이메일 인증이 필요한 환경(프로덕션 등): internal force-verify
  if (!accessToken && body.data?.requiresEmailVerification) {
    const internalToken = process.env.INTERNAL_API_TOKEN;
    if (!internalToken) {
      throw new Error(
        'signup requires email verification but INTERNAL_API_TOKEN is not set for E2E force-verify',
      );
    }
    const verifyRes = await request.post('/api/v1/internal/auth/force-verify-email', {
      headers: { 'X-Internal-Token': internalToken },
      data: { email },
    });
    const verifyBody = await verifyRes.json();
    if (!verifyRes.ok() || !verifyBody.success) {
      throw new Error(`force-verify failed: ${verifyRes.status()} ${JSON.stringify(verifyBody)}`);
    }
    accessToken = verifyBody.data.accessToken as string;
  }

  if (!accessToken) {
    throw new Error(`signup succeeded but no accessToken: ${JSON.stringify(body)}`);
  }

  return { email, password, name, token: accessToken };
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
