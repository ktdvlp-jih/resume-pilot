const STORAGE_KEY = 'rp-exp-chat-session';

export function loadStoredExperienceChatSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeExperienceChatSessionId(sessionId: string | null) {
  try {
    if (sessionId) localStorage.setItem(STORAGE_KEY, sessionId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
