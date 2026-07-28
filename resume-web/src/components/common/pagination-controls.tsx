import { useMemo } from 'react';
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

type PageItem = number | 'ellipsis';

function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push('ellipsis');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);

  return items;
}

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
  const pageItems = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);

  if (total === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-sm text-muted-foreground">
        {t('common.paginationSummary', { from, to, total })}
      </p>
      <nav className="flex items-center gap-1" aria-label={t('common.pagination', { defaultValue: 'Pagination' })}>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('common.previous')}
        >
          <ChevronLeft className="size-4" />
        </Button>

        {pageItems.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1.5 text-sm text-muted-foreground"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'secondary' : 'ghost'}
              size="icon-sm"
              className={cn('min-w-8', item === page && 'pointer-events-none')}
              onClick={() => onPageChange(item)}
              aria-label={t('common.pageNumber', { defaultValue: 'Page {{page}}', page: item })}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('common.next')}
        >
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  );
}
