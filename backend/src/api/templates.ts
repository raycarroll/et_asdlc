// Templates API Endpoints
// Based on specs/001-idea-spec-workflow/contracts/api.md

import express from 'express';
import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticate } from './middleware/auth.js';
import { requireAdmin } from './middleware/rbac.js';
import { logger } from '../utils/logger.js';
import {
  templateFromRow,
  type Template,
  type TemplateRow,
} from '../models/template.js';

export function createTemplatesRouter(pool: Pool, templatesPath: string) {
  const router = express.Router();

  /**
   * GET /api/v1/templates
   * List all available templates
   */
  router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      logger.info('Listing templates');

      // Fetch all templates from database
      const sql = `
        SELECT
          id,
          type,
          file_path,
          name,
          description,
          current_version_sha,
          last_modified_by,
          last_modified_at,
          created_at,
          updated_at
        FROM templates
        ORDER BY type ASC, name ASC
      `;

      const result = await pool.query(sql);

      const templates = result.rows.map((row: TemplateRow) =>
        templateFromRow(row)
      );

      logger.info('Templates listed successfully', {
        count: templates.length,
      });

      return res.status(200).json({
        templates: templates.map((t) => ({
          id: t.id,
          type: t.type,
          name: t.name,
          description: t.description,
          filePath: t.filePath,
          lastModifiedAt: t.lastModifiedAt,
          lastModifiedBy: t.lastModifiedBy,
        })),
      });
    } catch (error) {
      logger.error('Unexpected error in GET /templates', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while listing templates',
      });
    }
  });

  /**
   * GET /api/v1/templates/:id
   * Get template content by ID
   */
  router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        return res.status(400).json({
          error: 'Invalid ID',
          message: 'Template ID must be a valid UUID',
        });
      }

      logger.info('Getting template details', { templateId: id });

      // Fetch template from database
      const sql = `
        SELECT
          id,
          type,
          file_path,
          name,
          description,
          current_version_sha,
          last_modified_by,
          last_modified_at,
          created_at,
          updated_at
        FROM templates
        WHERE id = $1
      `;

      const result = await pool.query(sql, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Template with ID ${id} not found`,
        });
      }

      const template = templateFromRow(result.rows[0] as TemplateRow);

      // Read template content from file
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');

      const fullPath = join(templatesPath, template.filePath);
      const content = await readFile(fullPath, 'utf-8');

      logger.info('Template details retrieved successfully', {
        templateId: id,
        filePath: template.filePath,
      });

      return res.status(200).json({
        id: template.id,
        type: template.type,
        name: template.name,
        description: template.description,
        filePath: template.filePath,
        content,
        currentVersionSha: template.currentVersionSha,
        lastModifiedAt: template.lastModifiedAt,
        lastModifiedBy: template.lastModifiedBy,
      });
    } catch (error) {
      logger.error('Unexpected error in GET /templates/:id', {
        templateId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while fetching template',
      });
    }
  });

  /**
   * PUT /api/v1/templates/:id
   * Update template content
   */
  router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { content } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        return res.status(400).json({
          error: 'Invalid ID',
          message: 'Template ID must be a valid UUID',
        });
      }

      // Validate content is provided
      if (content === undefined || content === null) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Template content is required',
        });
      }

      // Get authenticated user
      const user = (req as any).user;

      logger.info('Updating template', {
        templateId: id,
        userId: user.userId,
      });

      // Fetch template from database
      const selectSql = `
        SELECT
          id,
          type,
          file_path,
          name,
          description,
          current_version_sha,
          last_modified_by,
          last_modified_at,
          created_at,
          updated_at
        FROM templates
        WHERE id = $1
      `;

      const selectResult = await pool.query(selectSql, [id]);

      if (selectResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Template with ID ${id} not found`,
        });
      }

      const template = templateFromRow(selectResult.rows[0] as TemplateRow);

      // Validate template content
      const { validateTemplateContent } = await import('../services/template/validator.js');
      const validation = await validateTemplateContent(content, template.type);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Template content validation failed',
          errors: validation.errors,
        });
      }

      // Write template to file
      const { writeFile } = await import('fs/promises');
      const { join } = await import('path');

      const fullPath = join(templatesPath, template.filePath);
      await writeFile(fullPath, content, 'utf-8');

      // Commit changes to git
      const { commitTemplateChange } = await import('../services/template/template-committer.js');
      const commitSha = await commitTemplateChange(
        template.filePath,
        content,
        user.email,
        user.userId,
        templatesPath
      );

      // Update database with new version SHA
      const updateSql = `
        UPDATE templates
        SET
          current_version_sha = $1,
          last_modified_by = $2,
          last_modified_at = $3,
          updated_at = $3
        WHERE id = $4
        RETURNING *
      `;

      const now = new Date();
      const updateResult = await pool.query(updateSql, [
        commitSha,
        user.userId,
        now,
        id,
      ]);

      const updatedTemplate = templateFromRow(updateResult.rows[0] as TemplateRow);

      logger.info('Template updated successfully', {
        templateId: id,
        commitSha,
        userId: user.userId,
      });

      return res.status(200).json({
        id: updatedTemplate.id,
        type: updatedTemplate.type,
        name: updatedTemplate.name,
        filePath: updatedTemplate.filePath,
        currentVersionSha: updatedTemplate.currentVersionSha,
        lastModifiedAt: updatedTemplate.lastModifiedAt,
        lastModifiedBy: updatedTemplate.lastModifiedBy,
      });
    } catch (error) {
      logger.error('Unexpected error in PUT /templates/:id', {
        templateId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while updating template',
      });
    }
  });

  return router;
}
