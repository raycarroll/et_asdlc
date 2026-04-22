// Simplified Ideas API Endpoints (GET only, no publishing)
// Temporary version to get UI working while git integration is fixed

import express from 'express';
import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticate } from './middleware/auth.js';
import { logger } from '../utils/logger.js';

export function createIdeasRouter(pool: Pool) {
  const router = express.Router();

  /**
   * GET /api/v1/ideas
   * List published ideas (simplified - no complex filtering yet)
   */
  router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
      logger.info('Listing ideas (simplified)');

      // Simple query - just get all ideas with basic info
      const query = `
        SELECT
          i.id,
          i.title,
          i.status,
          i.git_path,
          i.git_commit_sha,
          i.created_at,
          i.published_at,
          i.updated_at,
          u.id as author_id,
          u.email as author_email,
          u.name as author_name,
          m.summary,
          m.tags
        FROM ideas i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN metadata_records m ON i.id = m.idea_id
        ORDER BY i.created_at DESC
        LIMIT 100
      `;

      const result = await pool.query(query);

      const ideas = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        gitPath: row.git_path,
        gitCommitSha: row.git_commit_sha,
        createdAt: row.created_at,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
        author: {
          id: row.author_id,
          email: row.author_email,
          name: row.author_name,
        },
        summary: row.summary,
        tags: row.tags || [],
      }));

      logger.info('Ideas listed successfully', { count: ideas.length });

      return res.json({
        ideas,
        total: ideas.length,
        page: 1,
        pageSize: 100,
        totalPages: 1,
      });
    } catch (error) {
      logger.error('Error listing ideas', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list ideas',
      });
    }
  });

  /**
   * GET /api/v1/ideas/:id
   * Get a specific idea by ID
   */
  router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      logger.info('Getting idea', { id });

      const query = `
        SELECT
          i.id,
          i.title,
          i.status,
          i.git_path,
          i.git_commit_sha,
          i.created_at,
          i.published_at,
          i.updated_at,
          u.id as author_id,
          u.email as author_email,
          u.name as author_name,
          m.summary,
          m.goals,
          m.requirements,
          m.tags
        FROM ideas i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN metadata_records m ON i.id = m.idea_id
        WHERE i.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Idea not found',
        });
      }

      const row = result.rows[0];
      const idea = {
        id: row.id,
        title: row.title,
        status: row.status,
        gitPath: row.git_path,
        gitCommitSha: row.git_commit_sha,
        createdAt: row.created_at,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
        author: {
          id: row.author_id,
          email: row.author_email,
          name: row.author_name,
        },
        summary: row.summary,
        goals: row.goals,
        requirements: row.requirements,
        tags: row.tags || [],
      };

      logger.info('Idea retrieved successfully', { id });

      return res.json(idea);
    } catch (error) {
      logger.error('Error getting idea', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get idea',
      });
    }
  });

  return router;
}
