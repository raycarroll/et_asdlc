// useQueryParams Hook
// React hook for managing URL query parameters
// Based on specs/001-idea-spec-workflow/spec.md (FR-014b)

'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import type { IdeaFilters, PaginationParams } from '../services/api';

export interface QueryParamsState {
  filters: IdeaFilters;
  pagination: PaginationParams;
}

/**
 * Custom hook for managing filter and pagination state in URL query parameters
 */
export function useQueryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Parse query parameters into filters and pagination
   */
  const parseQueryParams = useCallback((): QueryParamsState => {
    const filters: IdeaFilters = {};
    const pagination: PaginationParams = {};

    // Parse filters
    const author = searchParams?.get('author');
    if (author) {
      filters.author = author;
    }

    const status = searchParams?.get('status');
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      filters.status = status as 'draft' | 'published' | 'archived';
    }

    const tags = searchParams?.get('tags');
    if (tags) {
      filters.tags = tags.split(',').map((t) => t.trim());
    }

    const dateFrom = searchParams?.get('dateFrom');
    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }

    const dateTo = searchParams?.get('dateTo');
    if (dateTo) {
      filters.dateTo = dateTo;
    }

    const search = searchParams?.get('search');
    if (search) {
      filters.search = search;
    }

    // Parse pagination
    const page = searchParams?.get('page');
    if (page) {
      const parsed = parseInt(page, 10);
      if (!isNaN(parsed) && parsed > 0) {
        pagination.page = parsed;
      }
    }

    const pageSize = searchParams?.get('pageSize');
    if (pageSize) {
      const parsed = parseInt(pageSize, 10);
      if (!isNaN(parsed) && parsed > 0) {
        pagination.pageSize = parsed;
      }
    }

    return { filters, pagination };
  }, [searchParams]);

  /**
   * Update URL query parameters with new filters and pagination
   */
  const updateQueryParams = useCallback(
    (state: Partial<QueryParamsState>) => {
      const params = new URLSearchParams(searchParams?.toString() || '');

      // Update filters
      if (state.filters) {
        // Remove old filter params
        params.delete('author');
        params.delete('status');
        params.delete('tags');
        params.delete('dateFrom');
        params.delete('dateTo');
        params.delete('search');

        // Add new filter params
        if (state.filters.author) {
          params.set('author', state.filters.author);
        }
        if (state.filters.status) {
          params.set('status', state.filters.status);
        }
        if (state.filters.tags && state.filters.tags.length > 0) {
          params.set('tags', state.filters.tags.join(','));
        }
        if (state.filters.dateFrom) {
          params.set('dateFrom', state.filters.dateFrom);
        }
        if (state.filters.dateTo) {
          params.set('dateTo', state.filters.dateTo);
        }
        if (state.filters.search) {
          params.set('search', state.filters.search);
        }
      }

      // Update pagination
      if (state.pagination) {
        if (state.pagination.page) {
          params.set('page', state.pagination.page.toString());
        }
        if (state.pagination.pageSize) {
          params.set('pageSize', state.pagination.pageSize.toString());
        }
      }

      // Update URL without page refresh
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(url);
    },
    [searchParams, pathname, router]
  );

  /**
   * Clear all query parameters
   */
  const clearQueryParams = useCallback(() => {
    router.push(pathname || '/browse');
  }, [pathname, router]);

  /**
   * Get current query parameters as object
   */
  const getCurrentState = useCallback((): QueryParamsState => {
    return parseQueryParams();
  }, [parseQueryParams]);

  return {
    getCurrentState,
    updateQueryParams,
    clearQueryParams,
    parseQueryParams,
  };
}
