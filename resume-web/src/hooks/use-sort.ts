import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export function useSort<T>(
  items: T[],
  comparators: Record<string, (a: T, b: T) => number>,
  defaultKey?: string,
  defaultDirection: SortDirection = 'desc',
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey ?? null);
  const [direction, setDirection] = useState<SortDirection>(defaultDirection);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey || !comparators[sortKey]) return items;
    const cmp = comparators[sortKey];
    const copy = [...items].sort(cmp);
    return direction === 'desc' ? copy.reverse() : copy;
  }, [items, sortKey, direction, comparators]);

  return { sorted, sortKey, direction, toggleSort };
}
