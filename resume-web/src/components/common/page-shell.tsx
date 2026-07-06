import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageShellProps = {
  children: ReactNode;
  className?: string;
  size?: 'md' | 'lg' | 'xl';
};

const widths = {
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
} as const;

export function PageShell({ children, className, size = 'xl' }: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full space-y-6', widths[size], className)}>
      {children}
    </div>
  );
}
