import { test, expect } from '@playwright/test';
import { authHeaders, seedAuthSession, signupViaApi } from '../helpers/auth';

const JOB_POSTING_TEXT = `
[TC-AI E2E Corp] Backend Developer 채용
직무: Java Spring Boot 백엔드 개발
필수 사항:
- Java, Spring Boot, PostgreSQL
- REST API 설계 및 AWS 운영 경험
우대 사항:
- Docker, Kubernetes
`.trim();

test.describe('TC-AI-05 AI E2E flow', () => {
  test.setTimeout(180_000);

  test('experience → job analysis → workspace AI pipeline', async ({ page, request }) => {
    const stamp = Date.now();
    const user = await signupViaApi(request, stamp);
    await seedAuthSession(page, user.token);

    // Step 1–2: experiences (create auto-embeds via API)
    const expPayload = {
      type: 'PROJECT',
      title: `Spring API ${stamp}`,
      description:
        'Spring Boot와 PostgreSQL로 REST API를 개발하고 AWS에 배포했습니다. Docker로 컨테이너화했습니다.',
      role: 'Backend Engineer',
      result: 'API 응답 시간 30% 개선',
    };
    for (let i = 0; i < 2; i++) {
      const res = await request.post('/api/v1/experiences', {
        headers: authHeaders(user.token),
        data: { ...expPayload, title: `${expPayload.title} ${i + 1}` },
      });
      expect(res.ok()).toBeTruthy();
    }

    const listRes = await request.get('/api/v1/experiences', { headers: authHeaders(user.token) });
    const experiences = (await listRes.json()).data as Array<{ id: string }>;
    expect(experiences.length).toBeGreaterThanOrEqual(2);

    // Explicit embed (TC-AI-05 step 2)
    for (const exp of experiences.slice(0, 2)) {
      const embedRes = await request.post(`/api/v1/experiences/${exp.id}/embed`, {
        headers: authHeaders(user.token),
      });
      expect(embedRes.ok()).toBeTruthy();
    }

    // Step 3: job posting text upload (API — stable before UI testids deploy)
    const jobTitle = `TC-AI Job ${stamp}`;
    const jobRes = await request.post('/api/v1/job-postings/upload', {
      headers: authHeaders(user.token),
      data: {
        sourceType: 'TEXT',
        title: jobTitle,
        content: JOB_POSTING_TEXT,
      },
    });
    const jobBody = await jobRes.json();
    expect(jobRes.ok(), JSON.stringify(jobBody)).toBeTruthy();
    const job = jobBody.data as { id: string; title: string };

    const analysisRes = await request.get(`/api/v1/job-postings/${job.id}/analysis`, {
      headers: authHeaders(user.token),
    });
    const analysis = (await analysisRes.json()).data as { techKeywords?: string[]; companyName?: string };
    expect(analysisRes.ok()).toBeTruthy();
    expect((analysis.techKeywords ?? []).length + (analysis.companyName ? 1 : 0)).toBeGreaterThan(0);

    // Step 4: RAG recommend (API precheck)
    const recRes = await request.post('/api/v1/rag/recommend-experiences', {
      headers: authHeaders(user.token),
      data: { keywords: ['Java', 'Spring', 'PostgreSQL', 'AWS', 'Docker'], topK: 5 },
    });
    const recBody = await recRes.json();
    expect(recRes.ok(), JSON.stringify(recBody)).toBeTruthy();
    const recommendations = (recBody.data ?? []) as Array<{ title: string }>;
    expect(recommendations.length, 'RAG recommend returned no experiences — check embedding/RAG').toBeGreaterThan(0);

    // Step 5–6: workspace UI recommend + generate + result panels
    await page.goto('/workspace');
    await expect(page.getByTestId('workspace-page')).toBeVisible();
    await page.getByTestId('workspace-job-input').fill(JOB_POSTING_TEXT);

    await page
      .getByTestId('workspace-recommend-btn')
      .or(page.getByRole('button', { name: /관련 경험 추천|Recommend/i }))
      .click();
    await expect(page.getByText(recommendations[0].title).first()).toBeVisible({ timeout: 30_000 });

    const generateBtn = page
      .getByTestId('workspace-generate-btn')
      .or(page.getByRole('button', { name: /자기소개서 생성|Generate/i }));
    await generateBtn.click();
    await expect(generateBtn).not.toBeDisabled({ timeout: 120_000 });

    await expect(page.locator('p.whitespace-pre-wrap').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('p.whitespace-pre-wrap').first()).not.toHaveText(/내용이 부족|insufficient/i);

    // Result panel sections (TC-AI-05 step 6)
    await expect(
      page.getByText(/AI 흔적|AI trace|AI痕|AI 痕迹/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/첨삭|Review|レビュー|审阅/i).first()).toBeVisible();
    await expect(page.getByText(/면접|Interview|面接|面试/i).first()).toBeVisible();
    await expect(page.getByText(/키워드|Keyword|キーワード|关键词/i).first()).toBeVisible();

    // Step 7 proxy: user generation history (ai_usage_logs written server-side on generate)
    const gensRes = await request.get('/api/v1/ai/generations', { headers: authHeaders(user.token) });
    const gens = (await gensRes.json()).data as Array<{ outputContent?: string }>;
    expect(gensRes.ok()).toBeTruthy();
    expect(gens.length).toBeGreaterThan(0);
    expect(String(gens[0].outputContent ?? '').length).toBeGreaterThan(20);
  });
});
