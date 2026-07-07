import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SortDirection } from '@/hooks/use-sort';

type SortableTableHeadProps = {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
};

export function SortableTableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: SortableTableHeadProps) {
  const active = activeKey === sortKey;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1 font-medium text-muted-foreground hover:text-foreground"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className={cn('size-3.5', active && 'text-foreground')} />
      </Button>
    </TableHead>
  );
}
