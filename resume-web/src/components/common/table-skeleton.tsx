import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';

export function TableSkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, ri) => (
        <TableRow key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <TableCell key={ci}>
              <Skeleton className="h-4 w-full max-w-[180px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
