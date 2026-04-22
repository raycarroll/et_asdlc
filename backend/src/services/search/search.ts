// Full-Text Search Service
// PostgreSQL tsvector-based search for idea metadata
// Based on specs/001-idea-spec-workflow/data-model.md

import { logger } from '../../utils/logger.js';
import type { Pool, QueryResult } from 'pg';

export interface SearchQuery {
  query: string; // Search string
  fields?: ('summary' | 'goals' | 'requirements')[]; // Optional: limit search to specific fields
  minRank?: number; // Minimum relevance rank (0.0 - 1.0)
}

export interface SearchResult {
  ideaId: string;
  rank: number; // Relevance score (higher = more relevant)
  headline?: string; // Highlighted excerpt showing matched terms
}

export interface SearchFilter {
  author?: string; // Filter by author email
  status?: 'draft' | 'published' | 'archived'; // Filter by status
  tags?: string[]; // Filter by tags (OR logic)
  dateFrom?: Date; // Filter by creation date >= this value
  dateTo?: Date; // Filter by creation date <= this value
}

/**
 * Execute full-text search across idea metadata
 * Uses PostgreSQL tsvector and ts_rank for relevance scoring
 */
export async function searchIdeas(
  query: SearchQuery,
  filter: SearchFilter,
  pool: Pool
): Promise<SearchResult[]> {
  logger.debug('Executing full-text search', {
    query: query.query,
    filter,
  });

  // Build search query with filters
  const params: any[] = [];
  const whereClauses: string[] = [];
  let paramCounter = 1;

  // Full-text search query
  if (query.query && query.query.trim() !== '') {
    const tsQuery = sanitizeSearchQuery(query.query);
    params.push(tsQuery);
    whereClauses.push(`m.full_text_search @@ to_tsquery('english', $${paramCounter})`);
    paramCounter++;
  }

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

  // Apply minimum rank filter if specified
  const minRank = query.minRank || 0.0;

  // Build SQL query
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT
      i.id as idea_id,
      ${query.query && query.query.trim() !== ''
        ? `ts_rank(m.full_text_search, to_tsquery('english', $1)) as rank,
           ts_headline('english',
             coalesce(m.summary, '') || ' ' || coalesce(m.goals, '') || ' ' || coalesce(m.requirements, ''),
             to_tsquery('english', $1),
             'MaxWords=50, MinWords=25, MaxFragments=1'
           ) as headline`
        : `0.0 as rank, NULL as headline`}
    FROM ideas i
    JOIN metadata_records m ON i.id = m.idea_id
    JOIN users u ON i.user_id = u.id
    ${whereClause}
    ${query.query && query.query.trim() !== '' ? `HAVING ts_rank(m.full_text_search, to_tsquery('english', $1)) >= ${minRank}` : ''}
    ORDER BY ${query.query && query.query.trim() !== '' ? 'rank DESC' : 'i.created_at DESC'}
  `;

  logger.debug('Search SQL', { sql, params });

  try {
    const result: QueryResult = await pool.query(sql, params);

    const searchResults: SearchResult[] = result.rows.map((row) => ({
      ideaId: row.idea_id,
      rank: parseFloat(row.rank) || 0.0,
      headline: row.headline || undefined,
    }));

    logger.info('Search completed', {
      query: query.query,
      resultCount: searchResults.length,
      topRank: searchResults.length > 0 ? searchResults[0].rank : 0,
    });

    return searchResults;
  } catch (error) {
    logger.error('Search query failed', error as Error, {
      query: query.query,
      filter,
    });
    throw new Error(`Search failed: ${(error as Error).message}`);
  }
}

/**
 * Sanitize user search query to prevent SQL injection and format for PostgreSQL
 * Converts spaces to AND operators and handles special characters
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove special characters that could break ts_query syntax
  let sanitized = query
    .replace(/[()&|!<>:*]/g, ' ') // Remove tsquery special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Split into words and join with AND operator (&)
  const words = sanitized
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => word + ':*'); // Add prefix matching

  if (words.length === 0) {
    return '';
  }

  // Join with AND operator
  return words.join(' & ');
}

/**
 * Get popular tags for autocomplete/suggestions
 * Returns most frequently used tags in descending order
 */
export async function getPopularTags(
  pool: Pool,
  limit: number = 20
): Promise<{ tag: string; count: number }[]> {
  logger.debug('Fetching popular tags', { limit });

  const sql = `
    SELECT name as tag, usage_count as count
    FROM tags
    WHERE usage_count > 0
    ORDER BY usage_count DESC, name ASC
    LIMIT $1
  `;

  try {
    const result: QueryResult = await pool.query(sql, [limit]);

    return result.rows.map((row) => ({
      tag: row.tag,
      count: parseInt(row.count, 10),
    }));
  } catch (error) {
    logger.error('Failed to fetch popular tags', error as Error);
    throw new Error(`Failed to fetch popular tags: ${(error as Error).message}`);
  }
}

/**
 * Get related tags for a given tag (tags that frequently appear together)
 */
export async function getRelatedTags(
  tag: string,
  pool: Pool,
  limit: number = 10
): Promise<string[]> {
  logger.debug('Fetching related tags', { tag, limit });

  const sql = `
    SELECT DISTINCT unnest(m.tags) as related_tag, COUNT(*) as co_occurrence
    FROM metadata_records m
    WHERE $1 = ANY(m.tags)
    AND unnest(m.tags) != $1
    GROUP BY related_tag
    ORDER BY co_occurrence DESC, related_tag ASC
    LIMIT $2
  `;

  try {
    const result: QueryResult = await pool.query(sql, [tag, limit]);

    return result.rows.map((row) => row.related_tag);
  } catch (error) {
    logger.error('Failed to fetch related tags', error as Error, { tag });
    throw new Error(`Failed to fetch related tags: ${(error as Error).message}`);
  }
}

/**
 * Suggest search queries based on partial input
 * Uses trigram similarity for fuzzy matching
 */
export async function suggestQueries(
  partialQuery: string,
  pool: Pool,
  limit: number = 5
): Promise<string[]> {
  logger.debug('Generating query suggestions', {
    partialQuery,
    limit,
  });

  if (partialQuery.trim().length < 2) {
    return [];
  }

  // Search for similar titles and summaries
  const sql = `
    SELECT DISTINCT title
    FROM ideas i
    JOIN metadata_records m ON i.id = m.idea_id
    WHERE
      i.title ILIKE $1 OR
      m.summary ILIKE $1
    ORDER BY
      CASE
        WHEN i.title ILIKE $2 THEN 0
        WHEN m.summary ILIKE $2 THEN 1
        ELSE 2
      END,
      i.created_at DESC
    LIMIT $3
  `;

  const likePattern = `%${partialQuery}%`;
  const startsWithPattern = `${partialQuery}%`;

  try {
    const result: QueryResult = await pool.query(sql, [
      likePattern,
      startsWithPattern,
      limit,
    ]);

    return result.rows.map((row) => row.title);
  } catch (error) {
    logger.error('Failed to generate query suggestions', error as Error, {
      partialQuery,
    });
    // Return empty array on error rather than failing
    return [];
  }
}
