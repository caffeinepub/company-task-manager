import { useCallback, useMemo, useState } from "react";

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(items.length / pageSize);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize],
  );

  const goTo = useCallback(
    (p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1))),
    [totalPages],
  );

  const reset = useCallback(() => setPage(0), []);

  return {
    page: safePage,
    pageItems,
    totalPages,
    totalItems: items.length,
    hasNext: safePage < totalPages - 1,
    hasPrev: safePage > 0,
    goNext: () => goTo(safePage + 1),
    goPrev: () => goTo(safePage - 1),
    goTo,
    reset,
    pageSize,
    startIndex: safePage * pageSize,
    endIndex: Math.min(safePage * pageSize + pageSize, items.length),
  };
}
