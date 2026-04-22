// Template Update Cache Model
// Tracks template update check timing to enforce 24-hour interval
// Based on specs/001-idea-spec-workflow/data-model.md

import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger.js';

/**
 * Template Update Cache entity
 * Singleton or per-user record tracking when template updates were last checked
 */
export interface TemplateUpdateCache {
  id: string;
  lastCheckTimestamp: Date;
  lastSuccessfulUpdate: Date | null;
  currentVersionSha: string;
  nextCheckDue: Date;
}

/**
 * Template Update Cache model for database operations
 */
export class TemplateUpdateCacheModel {
  constructor(private pool: Pool) {}

  /**
   * Get the global template update cache record
   * Returns null if no cache exists yet
   */
  async getGlobalCache(client?: PoolClient): Promise<TemplateUpdateCache | null> {
    const db = client || this.pool;

    try {
      const result = await db.query<{
        id: string;
        last_check_timestamp: Date;
        last_successful_update: Date | null;
        current_version_sha: string;
        next_check_due: Date;
      }>(
        `SELECT id, last_check_timestamp, last_successful_update,
                current_version_sha, next_check_due
         FROM template_update_cache
         ORDER BY last_check_timestamp DESC
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        lastCheckTimestamp: row.last_check_timestamp,
        lastSuccessfulUpdate: row.last_successful_update,
        currentVersionSha: row.current_version_sha,
        nextCheckDue: row.next_check_due,
      };
    } catch (error) {
      logger.error('Failed to get global template cache', { error });
      throw new Error('Failed to retrieve template update cache');
    }
  }

  /**
   * Check if a template update check is due based on cache
   * Returns true if:
   * - No cache exists yet (first check)
   * - next_check_due has passed
   */
  async isUpdateCheckDue(): Promise<boolean> {
    try {
      const cache = await this.getGlobalCache();

      if (!cache) {
        // No cache exists - first check is due
        return true;
      }

      // Check if next_check_due has passed
      const now = new Date();
      return now >= cache.nextCheckDue;
    } catch (error) {
      logger.error('Failed to check if update is due', { error });
      // On error, assume check is due (fail open)
      return true;
    }
  }

  /**
   * Update cache after checking for updates
   *
   * @param currentVersionSha - Git SHA of current templates
   * @param wasUpdated - Whether templates were actually updated
   */
  async recordUpdateCheck(
    currentVersionSha: string,
    wasUpdated: boolean,
    client?: PoolClient
  ): Promise<TemplateUpdateCache> {
    const db = client || this.pool;

    try {
      const now = new Date();

      const result = await db.query<{
        id: string;
        last_check_timestamp: Date;
        last_successful_update: Date | null;
        current_version_sha: string;
        next_check_due: Date;
      }>(
        `INSERT INTO template_update_cache
          (last_check_timestamp, last_successful_update, current_version_sha)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           last_check_timestamp = EXCLUDED.last_check_timestamp,
           last_successful_update = CASE
             WHEN $2 IS NOT NULL THEN EXCLUDED.last_successful_update
             ELSE template_update_cache.last_successful_update
           END,
           current_version_sha = EXCLUDED.current_version_sha
         RETURNING id, last_check_timestamp, last_successful_update,
                   current_version_sha, next_check_due`,
        [
          now,
          wasUpdated ? now : null,
          currentVersionSha,
        ]
      );

      const row = result.rows[0];

      logger.info('Recorded template update check', {
        currentVersionSha,
        wasUpdated,
        nextCheckDue: row.next_check_due,
      });

      return {
        id: row.id,
        lastCheckTimestamp: row.last_check_timestamp,
        lastSuccessfulUpdate: row.last_successful_update,
        currentVersionSha: row.current_version_sha,
        nextCheckDue: row.next_check_due,
      };
    } catch (error) {
      logger.error('Failed to record update check', { error, currentVersionSha });
      throw new Error('Failed to update template cache');
    }
  }

  /**
   * Get current version SHA from cache
   * Returns null if no cache exists
   */
  async getCurrentVersionSha(): Promise<string | null> {
    try {
      const cache = await this.getGlobalCache();
      return cache?.currentVersionSha || null;
    } catch (error) {
      logger.error('Failed to get current version SHA', { error });
      return null;
    }
  }

  /**
   * Initialize cache with initial version SHA
   * Only creates if no cache exists
   */
  async initializeCache(initialVersionSha: string): Promise<void> {
    try {
      const existing = await this.getGlobalCache();

      if (existing) {
        logger.debug('Template cache already initialized');
        return;
      }

      await this.recordUpdateCheck(initialVersionSha, true);
      logger.info('Initialized template update cache', { initialVersionSha });
    } catch (error) {
      logger.error('Failed to initialize cache', { error });
      throw new Error('Failed to initialize template cache');
    }
  }
}
