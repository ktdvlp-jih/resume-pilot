import type { ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DataTableCardProps = {
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function DataTableCard({ toolbar, children, footer, className }: DataTableCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {toolbar && (
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{toolbar}</div>
        </CardHeader>
      )}
      <CardContent className={cn('p-0', !toolbar && 'pt-0')}>{children}</CardContent>
      {footer && <CardFooter className="border-t py-3">{footer}</CardFooter>}
    </Card>
  );
}
