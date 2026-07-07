import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlPagination<T>(items: T[], pageSize = 10) {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page') || 1));

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }
  }, [page, totalPages, setParams]);

  const setPage = useCallback(
    (nextPage: number) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextPage <= 1) next.delete('page');
          else next.set('page', String(nextPage));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    setPage,
    pageSize,
    totalPages,
    paginated,
    total: items.length,
    from: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, items.length),
  };
}
