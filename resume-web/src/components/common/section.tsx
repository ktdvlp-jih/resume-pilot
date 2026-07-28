import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-4 space-y-0', className)}>
      {(title || action) && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
