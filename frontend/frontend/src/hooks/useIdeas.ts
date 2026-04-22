// useIdeas Hook
// React hook for idea queries with filters
// Based on specs/001-idea-spec-workflow/spec.md (FR-011, FR-013, FR-014)

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listIdeas,
  type IdeaListResponse,
  type IdeaFilters,
  type PaginationParams,
} from '../services/api';

export interface UseIdeasOptions {
  filters?: IdeaFilters;
  pagination?: PaginationParams;
  autoFetch?: boolean; // Automatically fetch on mount (default: true)
}

export interface UseIdeasResult {
  ideas: IdeaListResponse['ideas'];
  pagination: IdeaListResponse['pagination'];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setFilters: (filters: IdeaFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
}

/**
 * Custom hook for fetching and managing idea list with filters and pagination
 */
export function useIdeas(options: UseIdeasOptions = {}): UseIdeasResult {
  const {
    filters: initialFilters = {},
    pagination: initialPagination = {},
    autoFetch = true,
  } = options;

  const [filters, setFilters] = useState<IdeaFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationParams>(
    initialPagination
  );
  const [ideas, setIdeas] = useState<IdeaListResponse['ideas']>([]);
  const [paginationMeta, setPaginationMeta] =
    useState<IdeaListResponse['pagination']>({
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listIdeas(filters, pagination);

      setIdeas(response.ideas);
      setPaginationMeta(response.pagination);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch ideas';
      setError(errorMessage);
      console.error('Error fetching ideas:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchIdeas();
    }
  }, [fetchIdeas, autoFetch]);

  const handleSetFilters = useCallback((newFilters: IdeaFilters) => {
    setFilters(newFilters);
    // Reset to page 1 when filters change
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleSetPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const handleSetPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize }));
    // Reset to page 1 when page size changes
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  return {
    ideas,
    pagination: paginationMeta,
    loading,
    error,
    refetch: fetchIdeas,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
  };
}
