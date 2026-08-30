import type { ReactNode } from 'react';
import { PublicLayout } from '@/components/layout/public-layout';
import { DocumentHead } from '@/components/seo/document-head';
import { PublicAdSlot } from '@/components/seo/public-ad-slot';
import { cn } from '@/lib/utils';

export function PublicPage({
  title,
  description,
  path,
  noIndex = false,
  width = 'md',
  children,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  width?: 'md' | 'lg' | 'xl';
  children: ReactNode;
}) {
  return (
    <PublicLayout>
      <DocumentHead title={title} description={description} path={path} noIndex={noIndex} />
      <div
        className={cn(
          'mx-auto w-full px-4 py-12 md:px-6',
          width === 'xl' ? 'max-w-6xl' : width === 'lg' ? 'max-w-5xl' : 'max-w-3xl',
        )}
      >
        <div className="flex flex-col gap-8">
          {children}
          <PublicAdSlot className="min-h-16 rounded-lg border border-dashed border-border" />
        </div>
      </div>
    </PublicLayout>
  );
}
