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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
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
  listUsers: () => request<Array<{ id: string; email: string; role: string; enabled: boolean; createdAt?: string }>>('/api/v1/admin/users'),
  updateUserRole: (id: string, role: string) =>
    request<void>(`/api/v1/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  updateUserEnabled: (id: string, enabled: boolean) =>
    request<void>(`/api/v1/admin/users/${id}/enabled`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  listCompanies: () => request<Array<{ id: string; name: string; culture?: string; hiringKeywords: string[]; techStack: string[] }>>('/api/v1/admin/companies'),
  updateCompany: (id: string, data: { culture?: string; hiringKeywords?: string[] }) =>
    request<void>(`/api/v1/admin/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listAiLogs: () =>
    request<Array<{
      id: string;
      service: string;
      operation: string;
      model?: string;
      status: string;
      durationMs: number;
      createdAt: string;
    }>>('/api/v1/admin/ai-logs'),
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
  updateLlmRoute: (data: { id: string; modelName: string; priority: number; enabled: boolean }) =>
    request<{
      id: string;
      operation: string;
      providerId: string;
      providerSlug: string;
      providerName: string;
      modelName: string;
      priority: number;
      enabled: boolean;
    }>('/api/v1/admin/llm/routes', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
