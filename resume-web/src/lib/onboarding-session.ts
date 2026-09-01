const JOB_ID_KEY = 'rp-onboarding-job-id';
const EXPERIENCE_IDS_KEY = 'rp-onboarding-experience-ids';

export function saveOnboardingJobId(jobId: string) {
  try {
    sessionStorage.setItem(JOB_ID_KEY, jobId);
  } catch {
    /* ignore */
  }
}

export function loadOnboardingJobId(): string | null {
  try {
    return sessionStorage.getItem(JOB_ID_KEY);
  } catch {
    return null;
  }
}

export function saveOnboardingExperienceIds(ids: string[]) {
  try {
    sessionStorage.setItem(EXPERIENCE_IDS_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function loadOnboardingExperienceIds(): string[] {
  try {
    const raw = sessionStorage.getItem(EXPERIENCE_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function clearOnboardingSession() {
  try {
    sessionStorage.removeItem(JOB_ID_KEY);
    sessionStorage.removeItem(EXPERIENCE_IDS_KEY);
  } catch {
    /* ignore */
  }
}
