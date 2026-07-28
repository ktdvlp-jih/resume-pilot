import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageShellProps = {
  children: ReactNode;
  className?: string;
  /**
   * md≈768 · lg≈1024 · xl≈1152 · 2xl≈1536 · wide≈1728
   * 기본 wide: QHD 여백 축소. HD(1920)에서는 가용 폭이 더 좁아 w-full로 채워져 레이아웃 영향 없음.
   */
  size?: 'md' | 'lg' | 'xl' | '2xl' | 'wide';
};

const widths = {
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  wide: 'max-w-[108rem]', // 1728px
} as const;

export function PageShell({ children, className, size = 'wide' }: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full space-y-6 md:space-y-8', widths[size], className)}>
      {children}
    </div>
  );
}
