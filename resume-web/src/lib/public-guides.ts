export const PUBLIC_GUIDE_SLUGS = ['star', 'job-posting'] as const;
export type PublicGuideSlug = (typeof PUBLIC_GUIDE_SLUGS)[number];

const files = import.meta.glob('../content/public-guides/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function slugFromPath(filePath: string): string | null {
  return filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/i, '') ?? null;
}

const BODIES: Partial<Record<PublicGuideSlug, string>> = {};
for (const [filePath, body] of Object.entries(files)) {
  const slug = slugFromPath(filePath);
  if (slug && (PUBLIC_GUIDE_SLUGS as readonly string[]).includes(slug) && typeof body === 'string') {
    BODIES[slug as PublicGuideSlug] = body;
  }
}

export function isPublicGuideSlug(value: string | undefined): value is PublicGuideSlug {
  return !!value && (PUBLIC_GUIDE_SLUGS as readonly string[]).includes(value);
}

export function publicGuideBody(slug: PublicGuideSlug): string | null {
  const body = BODIES[slug];
  return body && body.trim() ? body : null;
}
