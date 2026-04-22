// Pagination Service
// Handle page offsets and limits for list endpoints
// Based on specs/001-idea-spec-workflow/contracts/api.md (FR-011b, FR-013a)

import { logger } from '../../utils/logger.js';

export interface PaginationParams {
  page: number; // Page number (1-indexed)
  pageSize: number; // Items per page
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationLimits {
  defaultPageSize: number;
  maxPageSize: number;
  minPageSize: number;
}

// Default pagination limits from API contract
export const DEFAULT_PAGINATION_LIMITS: PaginationLimits = {
  defaultPageSize: 20,
  maxPageSize: 100,
  minPageSize: 1,
};

/**
 * Parse and validate pagination parameters from request
 */
export function parsePaginationParams(
  page?: string | number,
  pageSize?: string | number,
  limits: PaginationLimits = DEFAULT_PAGINATION_LIMITS
): PaginationParams {
  // Parse page number
  let parsedPage = typeof page === 'string' ? parseInt(page, 10) : (page || 1);

  // Validate page number
  if (isNaN(parsedPage) || parsedPage < 1) {
    logger.warn('Invalid page number, defaulting to 1', { page });
    parsedPage = 1;
  }

  // Parse page size
  let parsedPageSize = typeof pageSize === 'string'
    ? parseInt(pageSize, 10)
    : (pageSize || limits.defaultPageSize);

  // Validate page size
  if (isNaN(parsedPageSize) || parsedPageSize < limits.minPageSize) {
    logger.warn('Invalid page size, using default', { pageSize });
    parsedPageSize = limits.defaultPageSize;
  }

  // Enforce max page size
  if (parsedPageSize > limits.maxPageSize) {
    logger.warn('Page size exceeds maximum, capping', {
      requested: parsedPageSize,
      max: limits.maxPageSize,
    });
    parsedPageSize = limits.maxPageSize;
  }

  return {
    page: parsedPage,
    pageSize: parsedPageSize,
  };
}

/**
 * Calculate SQL offset from page and page size
 */
export function calculateOffset(params: PaginationParams): number {
  return (params.page - 1) * params.pageSize;
}

/**
 * Build pagination metadata for response
 */
export function buildPaginationResult(
  params: PaginationParams,
  totalItems: number
): PaginationResult {
  const totalPages = Math.ceil(totalItems / params.pageSize);

  return {
    page: params.page,
    pageSize: params.pageSize,
    totalItems,
    totalPages: totalPages > 0 ? totalPages : 1,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1,
  };
}

/**
 * Generate SQL LIMIT and OFFSET clause
 */
export function generateLimitOffsetClause(params: PaginationParams): {
  sql: string;
  values: number[];
} {
  const offset = calculateOffset(params);

  return {
    sql: 'LIMIT $1 OFFSET $2',
    values: [params.pageSize, offset],
  };
}

/**
 * Validate that the requested page exists for the given total items
 * Returns adjusted page number if out of range
 */
export function validatePageRange(
  params: PaginationParams,
  totalItems: number
): PaginationParams {
  const totalPages = Math.ceil(totalItems / params.pageSize);

  if (totalItems === 0) {
    // If no items, return page 1
    return { ...params, page: 1 };
  }

  if (params.page > totalPages) {
    logger.warn('Requested page exceeds total pages, adjusting', {
      requestedPage: params.page,
      totalPages,
    });

    return {
      ...params,
      page: totalPages,
    };
  }

  return params;
}

/**
 * Create pagination links for navigation (useful for APIs)
 */
export interface PaginationLinks {
  first: string;
  prev?: string;
  next?: string;
  last: string;
}

export function buildPaginationLinks(
  baseUrl: string,
  params: PaginationParams,
  totalItems: number,
  queryParams?: Record<string, string>
): PaginationLinks {
  const totalPages = Math.ceil(totalItems / params.pageSize);

  // Build query string from params
  const buildUrl = (page: number): string => {
    const query = new URLSearchParams({
      page: page.toString(),
      pageSize: params.pageSize.toString(),
      ...queryParams,
    });

    return `${baseUrl}?${query.toString()}`;
  };

  const links: PaginationLinks = {
    first: buildUrl(1),
    last: buildUrl(totalPages),
  };

  if (params.page > 1) {
    links.prev = buildUrl(params.page - 1);
  }

  if (params.page < totalPages) {
    links.next = buildUrl(params.page + 1);
  }

  return links;
}

/**
 * Calculate item range for current page (e.g., "Showing 21-40 of 157")
 */
export function calculateItemRange(
  params: PaginationParams,
  totalItems: number
): { start: number; end: number } {
  if (totalItems === 0) {
    return { start: 0, end: 0 };
  }

  const start = calculateOffset(params) + 1;
  const end = Math.min(start + params.pageSize - 1, totalItems);

  return { start, end };
}

/**
 * Check if pagination is needed for the given total items
 */
export function needsPagination(
  totalItems: number,
  pageSize: number = DEFAULT_PAGINATION_LIMITS.defaultPageSize
): boolean {
  return totalItems > pageSize;
}
