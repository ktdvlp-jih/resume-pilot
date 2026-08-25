export const ALL_ROLES = ['USER', 'JOB_ADMIN', 'USER_ADMIN', 'ADMIN'] as const;

export type AppRole = (typeof ALL_ROLES)[number];

export function canAccessAdmin(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'JOB_ADMIN' || role === 'USER_ADMIN';
}

export function isFullAdmin(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canManageJobPostings(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'JOB_ADMIN';
}

export function canManageUsers(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'USER_ADMIN';
}

export function homePath(role: string | null | undefined): string {
  if (role === 'JOB_ADMIN') return '/job-postings';
  if (role === 'USER_ADMIN') return '/users';
  return '/prompts';
}
