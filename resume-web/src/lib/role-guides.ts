export const ROLE_GUIDE_IDS = ['Backend', 'Frontend', 'PM'] as const;
export type RoleGuideId = (typeof ROLE_GUIDE_IDS)[number];

const fromDocs = import.meta.glob('../../../docs/직군별-사용법/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const fromApp = import.meta.glob('../content/role-guides/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function roleIdFromPath(filePath: string): string | null {
  const name = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/i, '');
  return name || null;
}

export function isRoleGuideId(value: string | null | undefined): value is RoleGuideId {
  return !!value && (ROLE_GUIDE_IDS as readonly string[]).includes(value);
}

const ROLE_GUIDE_BODY: Partial<Record<RoleGuideId, string>> = {};
for (const [filePath, body] of Object.entries({ ...fromApp, ...fromDocs })) {
  const id = roleIdFromPath(filePath);
  if (isRoleGuideId(id) && typeof body === 'string' && body.trim()) {
    ROLE_GUIDE_BODY[id] = body;
  }
}

export function roleGuideBody(id: RoleGuideId): string | null {
  const body = ROLE_GUIDE_BODY[id];
  return body && body.trim().length > 0 ? body : null;
}

export function defaultRoleGuideId(): RoleGuideId {
  return ROLE_GUIDE_IDS.find((id) => roleGuideBody(id)) ?? ROLE_GUIDE_IDS[0];
}
