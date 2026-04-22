// usePagination Hook
// React hook for pagination state management
// Based on specs/001-idea-spec-workflow/spec.md (FR-013a, FR-013b)

'use client';

import { useState, useCallback } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  defaultPageSize?: number;
}

export interface UsePaginationResult {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: (totalPages: number) => void;
  reset: () => void;
}

/**
 * Custom hook for managing pagination state
 */
export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationResult {
  const {
    initialPage = 1,
    initialPageSize = 20,
    defaultPageSize = 20,
  } = options;

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPage = useCallback((newPage: number) => {
    if (newPage < 1) {
      setPageState(1);
      return;
    }
    setPageState(newPage);
  }, []);

  const setPageSize = useCallback((newPageSize: number) => {
    if (newPageSize < 1) {
      setPageSizeState(defaultPageSize);
      return;
    }
    setPageSizeState(newPageSize);
    // Reset to first page when page size changes
    setPageState(1);
  }, [defaultPageSize]);

  const nextPage = useCallback(() => {
    setPageState((prev) => prev + 1);
  }, []);

  const previousPage = useCallback(() => {
    setPageState((prev) => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const goToLastPage = useCallback((totalPages: number) => {
    setPageState(Math.max(1, totalPages));
  }, []);

  const reset = useCallback(() => {
    setPageState(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    reset,
  };
}
