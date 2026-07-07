import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function PaginationControls({
  page,
  totalPages,
  from,
  to,
  total,
  onPageChange,
  className,
}: PaginationControlsProps) {
  const { t } = useTranslation();

  if (total === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-sm text-muted-foreground">
        {t('common.paginationSummary', { from, to, total })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('common.previous')}
        >
          <ChevronLeft className="size-4" />
          {t('common.previous')}
        </Button>
        <span className="px-2 text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('common.next')}
        >
          {t('common.next')}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
