/** 브라우저에 남는 사용자 데이터는 반드시 userId로 스코프한다. */

export const USER_ID_KEY = 'userId';
export const WORKSPACE_DRAFT_KEY = 'resume-pilot-workspace-draft';
export const WORKSPACE_RESULT_KEY = 'resume-pilot-workspace-result';
export const PORTFOLIO_DRAFT_ROWS_KEY = 'resume-pilot.portfolio-draft-rows';

const LEGACY_UNSCOPED_KEYS = [
  WORKSPACE_DRAFT_KEY,
  WORKSPACE_RESULT_KEY,
  PORTFOLIO_DRAFT_ROWS_KEY,
];

export function userIdFromJwt(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const json = JSON.parse(atob(padded + pad)) as { sub?: unknown };
    return typeof json.sub === 'string' && json.sub.length > 0 ? json.sub : null;
  } catch {
    return null;
  }
}

function peekStoredUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

/** 저장된 userId. 예전 세션은 JWT sub에서 복원한다. */
export function getStoredUserId(): string | null {
  const stored = peekStoredUserId();
  if (stored) return stored;
  const fromJwt = userIdFromJwt(localStorage.getItem('accessToken'));
  if (fromJwt) {
    localStorage.setItem(USER_ID_KEY, fromJwt);
    return fromJwt;
  }
  return null;
}

export function userScopedKey(base: string): string | null {
  const id = getStoredUserId();
  if (!id) return null;
  return `${base}:${id}`;
}

/** 계정 전환·로그아웃 시 스코프 없는 레거시 키를 버린다. 다른 사람 글이 붙지 않게 한다. */
export function clearLegacyUnscopedUserData() {
  for (const key of LEGACY_UNSCOPED_KEYS) {
    localStorage.removeItem(key);
  }
}

export function bindSessionUserId(nextId: string | null, previousAccessToken: string | null) {
  const previousId = peekStoredUserId() || userIdFromJwt(previousAccessToken);
  if (previousId !== nextId) {
    clearLegacyUnscopedUserData();
  }
  if (nextId) {
    localStorage.setItem(USER_ID_KEY, nextId);
  } else {
    localStorage.removeItem(USER_ID_KEY);
    clearLegacyUnscopedUserData();
  }
}

export function readUserScopedItem(base: string): string | null {
  const scoped = userScopedKey(base);
  if (!scoped) return null;
  const existing = localStorage.getItem(scoped);
  if (existing != null) return existing;
  const legacy = localStorage.getItem(base);
  if (legacy == null) return null;
  localStorage.setItem(scoped, legacy);
  localStorage.removeItem(base);
  return legacy;
}

export function writeUserScopedItem(base: string, value: string) {
  const scoped = userScopedKey(base);
  if (!scoped) return;
  localStorage.setItem(scoped, value);
  localStorage.removeItem(base);
}

export function removeUserScopedItem(base: string) {
  const scoped = userScopedKey(base);
  if (scoped) localStorage.removeItem(scoped);
  localStorage.removeItem(base);
}
