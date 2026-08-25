export const ADMIN_ACCESS_ROLES = ['ADMIN', 'JOB_ADMIN'] as const;
export const ALL_ROLES = ['USER', 'JOB_ADMIN', 'ADMIN'] as const;

export type AppRole = (typeof ALL_ROLES)[number];

export function canAccessAdmin(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'JOB_ADMIN';
}

export function isFullAdmin(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function homePath(role: string | null | undefined): string {
  return role === 'JOB_ADMIN' ? '/job-postings' : '/prompts';
}
