import { resolveApiUrl } from './api-base';

const API_URL = resolveApiUrl();

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export { getAccessToken };

export function getUserRole(): string | null {
  return localStorage.getItem('userRole');
}

export function setTokens(access: string, refresh: string, role?: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
  if (role) {
    localStorage.setItem('userRole', role);
  }
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
}

type TokenPayload = { accessToken: string; refreshToken: string; role?: string };

export type AdminExperienceWrite = {
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
  skills?: string[];
  startDate?: string | null;
  endDate?: string | null;
};

export type AdminExperience = AdminExperienceWrite & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response = await fetch(`${API_URL}${path}`, { ...options, headers });

  const shouldRefresh =
    response.status === 401 && !!getRefreshToken() && !path.includes('/auth/');

  if (shouldRefresh) {
    const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    });
    if (refreshRes.ok) {
      const refreshed: ApiResponse<TokenPayload> = await refreshRes.json();
      setTokens(
        refreshed.data.accessToken,
        refreshed.data.refreshToken,
        refreshed.data.role ?? getUserRole() ?? undefined,
      );
      headers['Authorization'] = `Bearer ${refreshed.data.accessToken}`;
      response = await fetch(`${API_URL}${path}`, { ...options, headers });
    } else {
      clearTokens();
      if (!path.includes('/auth/')) {
        window.location.assign('/admin/login?expired=1');
      }
      throw new Error('Session expired');
    }
  }

  if (response.status === 401) {
    clearTokens();
    if (!path.includes('/auth/')) {
      window.location.assign('/admin/login?expired=1');
    }
    throw new Error('Authentication required');
  }

  const json: ApiResponse<T> = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error?.message || 'Request failed');
  }
  return json.data;
}

export const api = {
  login: (loginId: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; role: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: loginId, password }),
    }),
  listPrompts: () => request<Array<{ id: string; name: string; type: string; description?: string; activeVersionId?: string }>>('/api/v1/admin/prompts'),
  listPromptVersions: (templateId: string) =>
    request<Array<{
      id: string;
      versionNumber: number;
      personaPrompt: string;
      guardPrompt: string;
      skillPrompt: string;
      rubricPrompt: string;
      taskPrompt: string;
      outputPrompt: string;
      systemPrompt: string;
      userPrompt: string;
      active: boolean;
    }>>(`/api/v1/admin/prompts/${templateId}/versions`),
  createPromptVersion: (
    templateId: string,
    data: {
      personaPrompt: string;
      guardPrompt: string;
      skillPrompt: string;
      rubricPrompt: string;
      taskPrompt: string;
      outputPrompt: string;
      userPrompt: string;
    },
  ) =>
    request<{ id: string }>(`/api/v1/admin/prompts/${templateId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  activatePromptVersion: (templateId: string, versionId: string) =>
    request<void>(`/api/v1/admin/prompts/${templateId}/versions/${versionId}/activate`, { method: 'PUT' }),
  testPrompt: (data: {
    promptType?: string;
    personaPrompt?: string;
    guardPrompt?: string;
    skillPrompt?: string;
    rubricPrompt?: string;
    taskPrompt?: string;
    outputPrompt?: string;
    userPrompt?: string;
    variables?: Record<string, unknown>;
  }) =>
    request<{ result: string }>('/api/v1/admin/prompts/test', { method: 'POST', body: JSON.stringify(data) }),
  listForbidden: () => request<Array<{ id: string; expression: string; suggestion?: string; severity: string; enabled: boolean }>>('/api/v1/admin/forbidden-expressions'),
  createForbidden: (expression: string, suggestion?: string) =>
    request<{ id: string }>('/api/v1/admin/forbidden-expressions', {
      method: 'POST', body: JSON.stringify({ expression, suggestion }),
    }),
  deleteForbidden: (id: string) => request<void>(`/api/v1/admin/forbidden-expressions/${id}`, { method: 'DELETE' }),
  listUsers: () => request<Array<{
    id: string;
    email: string;
    role: string;
    name?: string;
    phone?: string;
    enabled: boolean;
    createdAt?: string;
  }>>('/api/v1/admin/users'),
  getUser: (id: string) =>
    request<{
      id: string;
      email: string;
      role: string;
      name?: string;
      phone?: string;
      enabled: boolean;
      createdAt?: string;
    }>(`/api/v1/admin/users/${id}`),
  listUserExperiences: (userId: string) =>
    request<AdminExperience[]>(`/api/v1/admin/users/${userId}/experiences`),
  createUserExperience: (userId: string, data: AdminExperienceWrite) =>
    request<AdminExperience>(`/api/v1/admin/users/${userId}/experiences`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUserExperience: (userId: string, experienceId: string, data: Partial<AdminExperienceWrite>) =>
    request<AdminExperience>(`/api/v1/admin/users/${userId}/experiences/${experienceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteUserExperience: (userId: string, experienceId: string) =>
    request<void>(`/api/v1/admin/users/${userId}/experiences/${experienceId}`, { method: 'DELETE' }),
  createUser: (data: { email: string; password: string; role?: string; name?: string }) =>
    request<{ id: string; email: string; role: string; enabled: boolean }>('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (id: string, data: { email?: string; name?: string; phone?: string; password?: string }) =>
    request<{ id: string; email: string; role: string; name?: string; phone?: string; enabled: boolean }>(
      `/api/v1/admin/users/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
    ),
  updateUserRole: (id: string, role: string) =>
    request<void>(`/api/v1/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  updateUserEnabled: (id: string, enabled: boolean) =>
    request<void>(`/api/v1/admin/users/${id}/enabled`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  listSkillCatalog: () => request<Array<{ id: number; name: string; category: string }>>('/api/v1/admin/skill-catalog'),
  listSkillCatalogPublic: () =>
    request<Array<{ name: string; category: string }>>('/api/v1/skill-catalog'),
  createSkillCatalog: (name: string, category: string) =>
    request<{ id: number }>('/api/v1/admin/skill-catalog', {
      method: 'POST', body: JSON.stringify({ name, category }),
    }),
  updateSkillCatalog: (id: number, data: { name?: string; category?: string }) =>
    request<void>(`/api/v1/admin/skill-catalog/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSkillCatalog: (id: number) => request<void>(`/api/v1/admin/skill-catalog/${id}`, { method: 'DELETE' }),
  listJobPostings: () =>
    request<Array<{
      id: string;
      title?: string;
      position?: string;
      closesAt?: string | null;
      sourceType: string;
      sourceUrl?: string;
      companyName?: string;
      shared: boolean;
      ownerEmail?: string;
      createdAt: string;
    }>>('/api/v1/admin/job-postings'),
  uploadSharedJobPosting: (data: {
    sourceType: string;
    content?: string;
    sourceUrl?: string;
    title: string;
    position: string;
    closesAt: string;
  }) =>
    request<{ id: string }>('/api/v1/admin/job-postings/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  setJobPostingShared: (id: string, shared: boolean) =>
    request<void>(`/api/v1/admin/job-postings/${id}/share`, {
      method: 'PATCH',
      body: JSON.stringify({ shared }),
    }),
  deleteJobPosting: (id: string) => request<void>(`/api/v1/admin/job-postings/${id}`, { method: 'DELETE' }),
  listCompanies: () => request<Array<{ id: string; name: string; culture?: string; hiringKeywords: string[]; techStack: string[] }>>('/api/v1/admin/companies'),
  updateCompany: (id: string, data: { culture?: string; hiringKeywords?: string[] }) =>
    request<void>(`/api/v1/admin/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listAiLogs: () =>
    request<Array<{
      id: string;
      userId?: string;
      service: string;
      operation: string;
      model?: string;
      inputTokens?: number;
      outputTokens?: number;
      status: string;
      durationMs: number;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
      createdAt: string;
    }>>('/api/v1/admin/ai-logs'),
  getGenerateLengthStats: () =>
    request<{
      sampleCount: number;
      unreliableFromChars: number | null;
      unreliableThreshold: number;
      minBucketN: number;
      uiMinChars: number;
      uiMaxChars: number;
      uiDefaultChars: number;
      generateMaxTokens: number;
      buckets: Array<{
        from: number;
        to: number;
        n: number;
        ok: number;
        shortCount: number;
        truncated: number;
        error: number;
        overshoot: number;
        insufficient: number;
        medianOutput: number;
        unreliableRate: number;
      }>;
      recent: Array<{
        createdAt: string;
        model?: string;
        title: string;
        targetChars: number;
        outputChars: number;
        quality: string;
      }>;
    }>('/api/v1/admin/ai-logs/section-length'),
  getDeployCiSettings: () =>
    request<{ deployAiE2eEnabled: boolean; deployE2eEnabled: boolean; updatedAt?: string }>('/api/v1/admin/deploy-ci-settings'),
  updateDeployCiSettings: (data: { deployAiE2eEnabled?: boolean; deployE2eEnabled?: boolean }) =>
    request<{ deployAiE2eEnabled: boolean; deployE2eEnabled: boolean; updatedAt?: string }>('/api/v1/admin/deploy-ci-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  listLlmProviders: () =>
    request<Array<{
      id: string;
      slug: string;
      displayName: string;
      providerType: string;
      baseUrl?: string;
      enabled: boolean;
      hasApiKey: boolean;
      apiKeyMasked: string;
    }>>('/api/v1/admin/llm/providers'),
  updateLlmProvider: (
    id: string,
    data: { displayName: string; baseUrl?: string; enabled?: boolean; apiKey?: string },
  ) =>
    request<{
      id: string;
      slug: string;
      displayName: string;
      providerType: string;
      baseUrl?: string;
      enabled: boolean;
      hasApiKey: boolean;
      apiKeyMasked: string;
    }>(`/api/v1/admin/llm/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  revealLlmProviderApiKey: (id: string) =>
    request<{
      id: string;
      slug: string;
      displayName: string;
      apiKey: string;
    }>(`/api/v1/admin/llm/providers/${id}/api-key`),
  listLlmRoutes: () =>
    request<Array<{
      id: string;
      operation: string;
      providerId: string;
      providerSlug: string;
      providerName: string;
      modelName: string;
      priority: number;
      enabled: boolean;
    }>>('/api/v1/admin/llm/routes'),
  updateLlmRoutes: (operation: string, routes: Array<{
    id: string;
    providerId: string;
    modelName: string;
    priority: number;
    enabled: boolean;
  }>) =>
    request<Array<{
      id: string;
      operation: string;
      providerId: string;
      providerSlug: string;
      providerName: string;
      modelName: string;
      priority: number;
      enabled: boolean;
    }>>(`/api/v1/admin/llm/routes/${operation}`, {
      method: 'PUT',
      body: JSON.stringify({ routes }),
    }),
};
