import { resolveApiUrl } from './api-base';
import { bindSessionUserId, userIdFromJwt } from './user-storage';

const API_URL = resolveApiUrl();

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  timestamp?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  role: string;
}

import type { CareerPortfolio } from './career-portfolio';

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  name?: string;
  phone?: string;
  bio?: string;
  careerPortfolio?: CareerPortfolio;
  createdAt: string;
}

export interface ResumeResponse {
  id: string;
  title: string;
  companyName?: string;
  description?: string;
  jobPostingId?: string;
  latestVersionNumber?: number;
  latestContent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeVersionResponse {
  id: string;
  resumeId: string;
  versionNumber: number;
  content: string;
  createdAt: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface ExperienceResponse {
  id: string;
  type: string;
  title: string;
  description?: string;
  role?: string;
  contribution?: string;
  result?: string;
  numericResult?: string;
  starSituation?: string;
  starTask?: string;
  starAction?: string;
  starResult?: string;
  skills: string[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobPostingResponse {
  id: string;
  title?: string;
  sourceType: string;
  sourceUrl?: string;
  rawContent?: string;
  parsedJson?: Record<string, unknown>;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  shared?: boolean;
  owned?: boolean;
}

export interface RecruitmentSection {
  title: string;
  jobResponsibilities?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  qualifications?: string[];
  headcount?: string | null;
}

export interface JobAnalysisResponse {
  id: string;
  jobPostingId: string;
  companyName?: string;
  position?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  qualifications: string[];
  jobResponsibilities: string[];
  talentProfile: string[];
  coreCompetencies: string[];
  techKeywords: string[];
  solutionKeywords?: string[];
  workConditions?: string[];
  benefits?: string[];
  hiringProcess?: string[];
  notes?: string[];
  painPoints?: string[];
  mustSolve?: string[];
  recruitmentSections?: RecruitmentSection[];
  jobDescription?: string;
  orgCulture?: string[];
  fitScore?: number;
  analysisJson?: Record<string, unknown>;
  createdAt: string;
}

export interface WritingStyleResponse {
  id: string;
  frequentWords: string[];
  avgSentenceLength?: number;
  usesFormalSpeech?: boolean;
  sentenceStyle?: string;
  expressionStyle?: string;
  connectors: string[];
  tone?: string;
  analysisJson?: Record<string, unknown>;
  sourceResumeIds: string[];
  updatedAt: string;
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function setTokens(access: string, refresh: string, userId?: string) {
  const previousAccess = getAccessToken();
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
  bindSessionUserId(userId || userIdFromJwt(access), previousAccess);
}

export function clearTokens() {
  bindSessionUserId(null, getAccessToken());
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function parseApiJson<T>(response: Response): Promise<ApiResponse<T>> {
  const raw = await response.text();
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    if (response.status === 502 || response.status === 504 || response.status === 524) {
      throw new Error(
        '서버 응답이 지연되어 연결이 끊겼습니다. 잠시 후 다시 생성해 주세요. (프록시 타임아웃)',
      );
    }
    throw new Error(
      `API가 JSON 대신 HTML을 반환했습니다 (HTTP ${response.status}). 서버·nginx 상태를 확인하세요.`,
    );
  }
  try {
    return JSON.parse(raw) as ApiResponse<T>;
  } catch {
    throw new Error(`응답 JSON 파싱 실패 (HTTP ${response.status})`);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response = await fetch(`${API_URL}${path}`, { ...options, headers });

  const shouldRefresh =
    response.status === 401 && getRefreshToken() && !path.includes('/auth/');

  if (shouldRefresh) {
    const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    });
    if (refreshRes.ok) {
      const refreshed = await parseApiJson<TokenResponse>(refreshRes);
      setTokens(refreshed.data.accessToken, refreshed.data.refreshToken, refreshed.data.userId);
      headers['Authorization'] = `Bearer ${refreshed.data.accessToken}`;
      response = await fetch(`${API_URL}${path}`, { ...options, headers });
    } else {
      clearTokens();
      if (!path.includes('/auth/')) {
        window.location.href = '/login?expired=1';
      }
      throw new Error('Session expired');
    }
  }

  if (response.status === 401) {
    clearTokens();
    if (!path.includes('/auth/')) {
      window.location.href = '/login?expired=1';
    }
    throw new Error('Authentication required');
  }

  if (response.status === 403) {
    throw new Error('Access denied');
  }

  const json = await parseApiJson<T>(response);
  if (!response.ok || !json.success) {
    throw new Error(json.error?.message || 'Request failed');
  }
  return json.data;
}

export const api = {
  signup: (email: string, password: string, name?: string) =>
    request<TokenResponse>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<UserResponse>('/api/v1/users/me'),
  updateMe: (data: {
    name?: string;
    phone?: string;
    bio?: string;
    careerPortfolio?: CareerPortfolio;
  }) =>
    request<UserResponse>('/api/v1/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/api/v1/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  listResumes: (jobPostingId?: string) =>
    request<ResumeResponse[]>(`/api/v1/resumes${jobPostingId ? `?jobPostingId=${jobPostingId}` : ''}`),
  listResumeVersions: (id: string) => request<ResumeVersionResponse[]>(`/api/v1/resumes/${id}/versions`),
  compareResumeVersions: (id: string, a: number, b: number) =>
    request<{ versionA: ResumeVersionResponse; versionB: ResumeVersionResponse }>(
      `/api/v1/resumes/${id}/versions/compare?versionA=${a}&versionB=${b}`),
  createResume: (data: { title: string; companyName?: string; description?: string; content?: string; jobPostingId?: string }) =>
    request<ResumeResponse>('/api/v1/resumes', { method: 'POST', body: JSON.stringify(data) }),
  createResumeVersion: (id: string, content: string, name?: string) =>
    request<ResumeVersionResponse>(`/api/v1/resumes/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify({ content, name }),
    }),
  deleteResume: (id: string) => request<void>(`/api/v1/resumes/${id}`, { method: 'DELETE' }),
  listExperiences: (type?: string) =>
    request<ExperienceResponse[]>(`/api/v1/experiences${type ? `?type=${type}` : ''}`),
  createExperience: (data: Record<string, unknown>) =>
    request<ExperienceResponse>('/api/v1/experiences', { method: 'POST', body: JSON.stringify(data) }),
  updateExperience: (id: string, data: Record<string, unknown>) =>
    request<ExperienceResponse>(`/api/v1/experiences/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteExperience: (id: string) => request<void>(`/api/v1/experiences/${id}`, { method: 'DELETE' }),
  listJobPostings: () => request<JobPostingResponse[]>('/api/v1/job-postings'),
  uploadJobPosting: (data: { sourceType: string; content?: string; sourceUrl?: string; title?: string }) =>
    request<JobPostingResponse>('/api/v1/job-postings/upload', { method: 'POST', body: JSON.stringify(data) }),
  uploadJobPostingFile: async (file: File, title?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}/api/v1/job-postings/upload/file`, { method: 'POST', headers, body: form });
    const json = await parseApiJson<JobPostingResponse>(response);
    if (!response.ok || !json.success) throw new Error(json.error?.message || 'Upload failed');
    return json.data;
  },
  getJobAnalysis: (id: string) => request<JobAnalysisResponse>(`/api/v1/job-postings/${id}/analysis`),
  updateJobAnalysis: (id: string, data: Record<string, unknown>) =>
    request<JobAnalysisResponse>(`/api/v1/job-postings/${id}/analysis`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteJobPosting: (id: string) => request<void>(`/api/v1/job-postings/${id}`, { method: 'DELETE' }),
  setJobPostingShared: (id: string, shared: boolean) =>
    request<JobPostingResponse>(`/api/v1/job-postings/${id}/share`, {
      method: 'PATCH',
      body: JSON.stringify({ shared }),
    }),
  getSkillCatalog: () => request<Array<{ name: string; category: string }>>('/api/v1/skill-catalog'),
  lookupCertification: (q: string) =>
    request<{
      configured: boolean;
      success: boolean;
      message?: string | null;
      matches: Array<{
        name: string;
        seriesName?: string;
        qualTypeName?: string;
        issuer: string;
        externalCode?: string;
        matchSource: string;
        score: number;
      }>;
    }>(`/api/v1/certifications/lookup?q=${encodeURIComponent(q)}`),
  getCertificationLookupStatus: () =>
    request<{ configured: boolean; provider?: string | null }>('/api/v1/certifications/status'),
  getWritingStyle: () => request<WritingStyleResponse | null>('/api/v1/writing-styles/me'),
  analyzeWritingStyle: (content: string, resumeId?: string) =>
    request<WritingStyleResponse>('/api/v1/writing-styles/analyze', {
      method: 'POST',
      body: JSON.stringify({ content, resumeId }),
    }),
  recommendExperiences: (keywords: string[], topK = 30, minScore = 0.28) =>
    request<Array<{ id: string; title: string; type: string; description?: string; result?: string; score: number }>>(
      '/api/v1/rag/recommend-experiences', {
        method: 'POST',
        body: JSON.stringify({ keywords, topK, minScore }),
      }),
  reembedAllExperiences: () =>
    request<{ count: number }>('/api/v1/experiences/embed-all', { method: 'POST' }),
  generateAi: (data: {
    keywords: string[];
    rewriteLevel: number;
    jobAnalysis?: Record<string, unknown>;
    jobPostingId?: string;
    sectionTitles?: string[];
    experienceIds?: string[];
    sectionExperienceIds?: string[][];
    sectionIndex?: number;
    existingParagraphs?: string[];
    sectionTargetChars?: number[];
    userInstruction?: string;
    skipPostprocess?: boolean;
  }) =>
    request<Record<string, unknown>>('/api/v1/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        keywords: data.keywords,
        rewriteLevel: data.rewriteLevel,
        jobAnalysis: data.jobAnalysis,
        jobPostingId: data.jobPostingId,
        sectionTitles: data.sectionTitles,
        experienceIds: data.experienceIds,
        sectionExperienceIds: data.sectionExperienceIds,
        sectionIndex: data.sectionIndex,
        existingParagraphs: data.existingParagraphs,
        sectionTargetChars: data.sectionTargetChars,
        userInstruction: data.userInstruction,
        skipPostprocess: data.skipPostprocess,
      }),
    }),
  detectAi: (content: string) =>
    request<Record<string, unknown>>('/api/v1/ai/detect', { method: 'POST', body: JSON.stringify({ content }) }),
  humanizeAi: (content: string, sentences: string[] = []) =>
    request<{
      content?: string;
      replacements?: Array<{ original?: string; revised?: string; reason?: string }>;
      changed_count?: number;
      analysis?: {
        grade?: string;
        grade_reason?: string;
        s1?: number;
        s2?: number;
        s3?: number;
        findings?: Array<{
          pattern?: number | null;
          severity?: string;
          title?: string;
          example?: string;
          why?: string;
        }>;
      };
      model?: string;
    }>('/api/v1/ai/humanize', {
      method: 'POST',
      body: JSON.stringify({ content, sentences }),
    }),
  reviewAi: (content: string, jobAnalysis?: Record<string, unknown>) =>
    request<Record<string, unknown>>('/api/v1/ai/review', {
      method: 'POST', body: JSON.stringify({ content, jobAnalysis }),
    }),
  reviewPortfolio: (sectionType: string, content: string) =>
    request<{
      relevant_experiences?: Array<{ id?: string; title?: string; why_fits?: string }>;
      unused_experiences?: Array<{ id?: string; title?: string; reason?: string }>;
      unsupported_claims?: Array<{ claim?: string; reason?: string }>;
      revision_directions?: string[];
      model?: string;
    }>('/api/v1/ai/portfolio-review', {
      method: 'POST',
      body: JSON.stringify({ sectionType, content }),
    }),
  analyzeSections: (sectionTitles: string[]) =>
    request<{
      sections?: Array<{
        index?: number;
        title?: string;
        intent?: string;
        needs_unique_story?: boolean;
        max_experiences?: number;
        look_for?: string[];
        asks?: string;
      }>;
      model?: string;
    }>('/api/v1/ai/analyze-sections', {
      method: 'POST',
      body: JSON.stringify({ sectionTitles }),
    }),
  interviewQuestions: (content: string) =>
    request<Record<string, unknown>>('/api/v1/ai/interview-questions', {
      method: 'POST', body: JSON.stringify({ content }),
    }),
  compareKeywords: (jobKeywords: string[], resumeContent: string) =>
    request<Record<string, unknown>>('/api/v1/ai/compare-keywords', {
      method: 'POST', body: JSON.stringify({ jobKeywords, resumeContent }),
    }),
  listAiGenerations: () => request<Array<{ id: string; outputContent: string; createdAt: string }>>('/api/v1/ai/generations'),
};
