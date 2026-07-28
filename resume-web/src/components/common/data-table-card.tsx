import type { ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DataTableCardProps = {
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** 본문 영역 클래스 (내부 스크롤 등) */
  bodyClassName?: string;
};

export function DataTableCard({ toolbar, children, footer, className, bodyClassName }: DataTableCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {toolbar && (
        <CardHeader className="shrink-0 border-b py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{toolbar}</div>
        </CardHeader>
      )}
      <CardContent className={cn('p-0', !toolbar && 'pt-0', bodyClassName)}>{children}</CardContent>
      {footer && <CardFooter className="shrink-0 border-t py-3">{footer}</CardFooter>}
    </Card>
  );
}
