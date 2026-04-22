// Ideas API Endpoints
// Based on specs/001-idea-spec-workflow/contracts/api.md

import express from 'express';
import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticate } from './middleware/auth.js';
import { atomicPublish } from '../services/publishing/transaction-coordinator.js';
import { logger } from '../utils/logger.js';
import type { Idea } from '../models/idea.js';
import type { Artifact } from '../models/artifact.js';
import {
  inferFileType,
  inferContentType,
} from '../models/artifact.js';

/**
 * Helper to extract string value from query parameter
 */
function getQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

export function createIdeasRouter(pool: Pool, repoPath: string) {
  const router = express.Router();

  /**
   * POST /api/v1/ideas
   * Publish a new idea (atomic git + database)
   */
  router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
      const { title, specification, artifacts, tags, metadata } = req.body;

      // Validate required fields
      if (!title || !specification) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Title and specification are required',
        });
      }

      // Get authenticated user from middleware
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      logger.info('Publishing new idea', {
        userId: user.userId,
        title,
        artifactCount: artifacts?.length || 0,
      });

      // Generate idea ID and git path
      const ideaId = crypto.randomUUID();
      const gitPath = `ideas/${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/spec.md`;

      // Create idea object
      const now = new Date();
      const idea: Idea = {
        id: ideaId,
        userId: user.userId,
        title,
        status: 'draft', // Will be updated to 'published' by transaction coordinator
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        gitPath,
        gitCommitSha: null,
      };

      // Process artifacts
      const processedArtifacts: Artifact[] = (artifacts || []).map(
        (artifact: any) => ({
          id: crypto.randomUUID(),
          ideaId,
          filePath: artifact.filePath,
          fileType: inferFileType(artifact.filePath),
          contentType: artifact.contentType || inferContentType(artifact.filePath),
          sizeBytes: artifact.content
            ? Buffer.from(artifact.content, 'base64').length
            : null,
          createdAt: now,
        })
      );

      // Execute atomic publish
      const result = await atomicPublish(
        {
          idea,
          specContent: specification,
          artifacts: processedArtifacts,
          userName: user.name || user.email,
          userEmail: user.email,
          repoPath,
        },
        pool
      );

      if (!result.success) {
        logger.error('Publish failed', {
          ideaId,
          error: result.error,
          rollbackPerformed: result.rollbackPerformed,
        });

        return res.status(500).json({
          error: 'Publish Failed',
          message: result.error,
          rollbackPerformed: result.rollbackPerformed || false,
        });
      }

      logger.info('Idea published successfully', {
        ideaId: result.ideaId,
        commitSha: result.commitSha,
      });

      // Return success response
      return res.status(201).json({
        id: result.ideaId,
        title,
        gitPath,
        gitCommitSha: result.commitSha,
        status: 'published',
        createdAt: now.toISOString(),
        publishedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Unexpected error in POST /ideas', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while publishing the idea',
      });
    }
  });

  /**
   * GET /api/v1/ideas
   * List published ideas with pagination, filtering, and search
   */
  router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
      const { parseFilters, validateFilters, buildFilterClause } = await import('../services/search/filters.js');
      const { parsePaginationParams, buildPaginationResult, calculateOffset } = await import('../services/search/pagination.js');

      // Parse filters from query parameters
      const filter = parseFilters({
        author: req.query.author as string,
        status: req.query.status as string,
        tags: req.query.tags as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        search: req.query.search as string,
      });

      // Validate filters
      const filterValidation = validateFilters(filter);
      if (!filterValidation.valid) {
        return res.status(400).json({
          error: 'Invalid Filters',
          message: filterValidation.errors.join(', '),
        });
      }

      // Parse pagination parameters
      const paginationParams = parsePaginationParams(
        getQueryString(req.query.page),
        getQueryString(req.query.pageSize)
      );

      logger.info('Listing ideas', {
        filter,
        pagination: paginationParams,
      });

      // Build SQL query with filters
      const filterClause = buildFilterClause(filter, 1);
      const whereClause = filterClause.sql ? `WHERE ${filterClause.sql}` : '';

      // Count total items matching filters
      const countSql = `
        SELECT COUNT(DISTINCT i.id) as total
        FROM ideas i
        JOIN metadata_records m ON i.id = m.idea_id
        JOIN users u ON i.user_id = u.id
        ${whereClause}
      `;

      const countResult = await pool.query(countSql, filterClause.params);
      const totalItems = parseInt(countResult.rows[0].total, 10);

      // Fetch paginated results
      const offset = calculateOffset(paginationParams);
      const dataSql = `
        SELECT
          i.id,
          i.title,
          i.status,
          i.created_at,
          i.published_at,
          u.id as author_id,
          u.email as author_email,
          m.summary,
          m.tags
        FROM ideas i
        JOIN metadata_records m ON i.id = m.idea_id
        JOIN users u ON i.user_id = u.id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT $${filterClause.paramOffset} OFFSET $${filterClause.paramOffset + 1}
      `;

      const dataParams = [...filterClause.params, paginationParams.pageSize, offset];
      const dataResult = await pool.query(dataSql, dataParams);

      // Build pagination metadata
      const pagination = buildPaginationResult(paginationParams, totalItems);

      // Format response
      const ideas = dataResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        author: {
          id: row.author_id,
          email: row.author_email,
        },
        status: row.status,
        summary: row.summary,
        tags: row.tags || [],
        createdAt: row.created_at,
        publishedAt: row.published_at,
      }));

      logger.info('Ideas listed successfully', {
        resultCount: ideas.length,
        totalItems,
      });

      return res.status(200).json({
        ideas,
        pagination,
      });
    } catch (error) {
      logger.error('Unexpected error in GET /ideas', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while listing ideas',
      });
    }
  });

  /**
   * GET /api/v1/ideas/:id
   * Get detailed information for a single idea
   */
  router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        return res.status(400).json({
          error: 'Invalid ID',
          message: 'Idea ID must be a valid UUID',
        });
      }

      logger.info('Getting idea details', { ideaId: id });

      // Fetch idea with metadata and author
      const ideaSql = `
        SELECT
          i.id,
          i.title,
          i.status,
          i.created_at,
          i.published_at,
          i.git_path,
          i.git_commit_sha,
          u.id as author_id,
          u.email as author_email,
          m.summary,
          m.goals,
          m.requirements,
          m.tags
        FROM ideas i
        JOIN metadata_records m ON i.id = m.idea_id
        JOIN users u ON i.user_id = u.id
        WHERE i.id = $1
      `;

      const ideaResult = await pool.query(ideaSql, [id]);

      if (ideaResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Idea with ID ${id} not found`,
        });
      }

      const idea = ideaResult.rows[0];

      // Fetch artifacts
      const artifactsSql = `
        SELECT
          id,
          file_path,
          file_type,
          content_type,
          size_bytes,
          created_at
        FROM artifacts
        WHERE idea_id = $1
        ORDER BY created_at ASC
      `;

      const artifactsResult = await pool.query(artifactsSql, [id]);

      // Format response
      const response = {
        id: idea.id,
        title: idea.title,
        author: {
          id: idea.author_id,
          email: idea.author_email,
        },
        status: idea.status,
        metadata: {
          summary: idea.summary,
          goals: idea.goals,
          requirements: idea.requirements,
          tags: idea.tags || [],
        },
        artifacts: artifactsResult.rows.map((artifact) => ({
          id: artifact.id,
          filePath: artifact.file_path,
          fileType: artifact.file_type,
          contentType: artifact.content_type,
          sizeBytes: artifact.size_bytes,
          createdAt: artifact.created_at,
        })),
        gitPath: idea.git_path,
        gitCommitSha: idea.git_commit_sha,
        createdAt: idea.created_at,
        publishedAt: idea.published_at,
      };

      logger.info('Idea details retrieved successfully', {
        ideaId: id,
        artifactCount: response.artifacts.length,
      });

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Unexpected error in GET /ideas/:id', {
        ideaId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while fetching idea details',
      });
    }
  });

  return router;
}
