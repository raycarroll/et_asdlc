// Filter Service
// Combine AND/OR filter logic for idea queries
// Based on specs/001-idea-spec-workflow/spec.md (FR-014a)

import { logger } from '../../utils/logger.js';

export interface IdeaFilter {
  author?: string; // Filter by author email
  status?: 'draft' | 'published' | 'archived'; // Filter by status
  tags?: string[]; // Filter by tags (OR logic)
  dateFrom?: Date; // Filter by creation date >= this value
  dateTo?: Date; // Filter by creation date <= this value
  search?: string; // Full-text search query
}

export interface FilterClause {
  sql: string; // SQL WHERE clause fragment
  params: any[]; // Parameter values for the clause
  paramOffset: number; // Starting parameter index (e.g., $3)
}

/**
 * Parse filter parameters from query string
 */
export function parseFilters(query: {
  author?: string;
  status?: string;
  tags?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): IdeaFilter {
  const filter: IdeaFilter = {};

  // Author filter
  if (query.author && query.author.trim() !== '') {
    filter.author = query.author.trim();
  }

  // Status filter
  if (query.status) {
    const validStatuses = ['draft', 'published', 'archived'];
    if (validStatuses.includes(query.status)) {
      filter.status = query.status as 'draft' | 'published' | 'archived';
    } else {
      logger.warn('Invalid status filter value', { status: query.status });
    }
  }

  // Tags filter (comma-separated string to array)
  if (query.tags && query.tags.trim() !== '') {
    filter.tags = query.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  // Date range filters
  if (query.dateFrom) {
    const dateFrom = new Date(query.dateFrom);
    if (!isNaN(dateFrom.getTime())) {
      filter.dateFrom = dateFrom;
    } else {
      logger.warn('Invalid dateFrom value', { dateFrom: query.dateFrom });
    }
  }

  if (query.dateTo) {
    const dateTo = new Date(query.dateTo);
    if (!isNaN(dateTo.getTime())) {
      filter.dateTo = dateTo;
    } else {
      logger.warn('Invalid dateTo value', { dateTo: query.dateTo });
    }
  }

  // Search query
  if (query.search && query.search.trim() !== '') {
    filter.search = query.search.trim();
  }

  logger.debug('Parsed filters', filter as Record<string, unknown>);

  return filter;
}

/**
 * Build SQL WHERE clause from filters
 * Combines multiple filters with AND logic
 * Tags use OR logic (match any tag)
 */
export function buildFilterClause(
  filter: IdeaFilter,
  paramOffset: number = 1
): FilterClause {
  const whereClauses: string[] = [];
  const params: any[] = [];
  let paramCounter = paramOffset;

  // Author filter
  if (filter.author) {
    params.push(filter.author);
    whereClauses.push(`u.email = $${paramCounter}`);
    paramCounter++;
  }

  // Status filter
  if (filter.status) {
    params.push(filter.status);
    whereClauses.push(`i.status = $${paramCounter}`);
    paramCounter++;
  }

  // Tags filter (OR logic - match any tag)
  if (filter.tags && filter.tags.length > 0) {
    params.push(filter.tags);
    whereClauses.push(`m.tags && $${paramCounter}::text[]`);
    paramCounter++;
  }

  // Date range filters
  if (filter.dateFrom) {
    params.push(filter.dateFrom.toISOString());
    whereClauses.push(`i.created_at >= $${paramCounter}`);
    paramCounter++;
  }

  if (filter.dateTo) {
    params.push(filter.dateTo.toISOString());
    whereClauses.push(`i.created_at <= $${paramCounter}`);
    paramCounter++;
  }

  // Full-text search
  if (filter.search) {
    params.push(sanitizeSearchTerm(filter.search));
    whereClauses.push(`m.full_text_search @@ to_tsquery('english', $${paramCounter})`);
    paramCounter++;
  }

  // Combine all clauses with AND
  const sql = whereClauses.length > 0 ? whereClauses.join(' AND ') : '';

  return {
    sql,
    params,
    paramOffset: paramCounter,
  };
}

/**
 * Sanitize search term for PostgreSQL ts_query
 * Removes special characters and formats for prefix matching
 */
function sanitizeSearchTerm(term: string): string {
  // Remove special tsquery characters
  let sanitized = term
    .replace(/[()&|!<>:*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words and add prefix matching
  const words = sanitized
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => word + ':*');

  if (words.length === 0) {
    return '';
  }

  // Join with AND operator
  return words.join(' & ');
}

/**
 * Validate filter values
 */
export function validateFilters(filter: IdeaFilter): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate email format for author filter
  if (filter.author) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(filter.author)) {
      errors.push('Invalid email format for author filter');
    }
  }

  // Validate status value
  if (filter.status) {
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(filter.status)) {
      errors.push(
        `Invalid status value: ${filter.status}. Must be one of: ${validStatuses.join(', ')}`
      );
    }
  }

  // Validate date range
  if (filter.dateFrom && filter.dateTo) {
    if (filter.dateFrom > filter.dateTo) {
      errors.push('dateFrom must be before or equal to dateTo');
    }
  }

  // Validate tags
  if (filter.tags) {
    if (filter.tags.length === 0) {
      errors.push('Tags filter cannot be empty');
    }

    // Check for invalid tag characters (only alphanumeric and hyphens allowed)
    const invalidTags = filter.tags.filter(
      (tag) => !/^[a-z0-9-]+$/.test(tag)
    );

    if (invalidTags.length > 0) {
      errors.push(
        `Invalid tag format (must be lowercase alphanumeric with hyphens): ${invalidTags.join(', ')}`
      );
    }
  }

  // Validate search query length
  if (filter.search) {
    if (filter.search.length > 500) {
      errors.push('Search query too long (maximum 500 characters)');
    }

    if (filter.search.length < 2) {
      errors.push('Search query too short (minimum 2 characters)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filter: IdeaFilter): boolean {
  return !!(
    filter.author ||
    filter.status ||
    (filter.tags && filter.tags.length > 0) ||
    filter.dateFrom ||
    filter.dateTo ||
    filter.search
  );
}

/**
 * Count active filters
 */
export function countActiveFilters(filter: IdeaFilter): number {
  let count = 0;

  if (filter.author) count++;
  if (filter.status) count++;
  if (filter.tags && filter.tags.length > 0) count++;
  if (filter.dateFrom) count++;
  if (filter.dateTo) count++;
  if (filter.search) count++;

  return count;
}

/**
 * Merge multiple filters with AND logic
 */
export function mergeFilters(
  ...filters: IdeaFilter[]
): IdeaFilter {
  const merged: IdeaFilter = {};

  for (const filter of filters) {
    if (filter.author) merged.author = filter.author;
    if (filter.status) merged.status = filter.status;
    if (filter.dateFrom) merged.dateFrom = filter.dateFrom;
    if (filter.dateTo) merged.dateTo = filter.dateTo;
    if (filter.search) merged.search = filter.search;

    // Merge tags (combine arrays)
    if (filter.tags) {
      merged.tags = merged.tags
        ? [...new Set([...merged.tags, ...filter.tags])]
        : [...filter.tags];
    }
  }

  return merged;
}

/**
 * Convert filter to human-readable description
 */
export function describeFilters(filter: IdeaFilter): string {
  const parts: string[] = [];

  if (filter.author) {
    parts.push(`author is ${filter.author}`);
  }

  if (filter.status) {
    parts.push(`status is ${filter.status}`);
  }

  if (filter.tags && filter.tags.length > 0) {
    parts.push(`tagged with ${filter.tags.join(' or ')}`);
  }

  if (filter.dateFrom) {
    parts.push(`created after ${filter.dateFrom.toISOString().split('T')[0]}`);
  }

  if (filter.dateTo) {
    parts.push(`created before ${filter.dateTo.toISOString().split('T')[0]}`);
  }

  if (filter.search) {
    parts.push(`matching "${filter.search}"`);
  }

  if (parts.length === 0) {
    return 'no filters';
  }

  return parts.join(', ');
}
