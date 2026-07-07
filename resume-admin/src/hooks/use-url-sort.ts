import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortDirection } from '@/hooks/use-sort';

export function useUrlSort<T>(
  items: T[],
  comparators: Record<string, (a: T, b: T) => number>,
  defaultKey: string,
  defaultDirection: SortDirection = 'desc',
) {
  const [params, setParams] = useSearchParams();
  const sortKey = params.get('sort') || defaultKey;
  const direction: SortDirection =
    params.get('dir') === 'asc' ? 'asc' : params.get('dir') === 'desc' ? 'desc' : defaultDirection;

  const toggleSort = useCallback(
    (key: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const currentSort = prev.get('sort') || defaultKey;
          const currentDir =
            prev.get('dir') === 'asc' ? 'asc' : prev.get('dir') === 'desc' ? 'desc' : defaultDirection;
          if (currentSort === key) {
            next.set('dir', currentDir === 'asc' ? 'desc' : 'asc');
          } else {
            next.set('sort', key);
            next.set('dir', 'asc');
          }
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [defaultKey, defaultDirection, setParams],
  );

  const sorted = useMemo(() => {
    const cmp = comparators[sortKey];
    if (!cmp) return items;
    const copy = [...items].sort(cmp);
    return direction === 'desc' ? copy.reverse() : copy;
  }, [items, sortKey, direction, comparators]);

  return { sorted, sortKey, direction, toggleSort };
}
