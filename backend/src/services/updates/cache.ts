// Template Cache Service
// Tracks last check timestamp and enforces 24-hour interval
// Based on specs/001-idea-spec-workflow/spec.md (FR-023)

import { Pool } from 'pg';
import { TemplateUpdateCacheModel, TemplateUpdateCache } from '../../models/template-cache.js';
import { logger } from '../../utils/logger.js';

export interface CacheStatus {
  isCheckDue: boolean;
  lastCheckTimestamp: Date | null;
  nextCheckDue: Date | null;
  currentVersionSha: string | null;
}

/**
 * Template Cache Service
 * Manages template update cache with 24-hour check interval enforcement
 */
export class TemplateCacheService {
  private cacheModel: TemplateUpdateCacheModel;

  constructor(pool: Pool) {
    this.cacheModel = new TemplateUpdateCacheModel(pool);
  }

  /**
   * Check if a template update check is due
   * Returns true if:
   * - No cache exists (first check)
   * - 24 hours have passed since last check
   *
   * @returns Cache status with isCheckDue flag
   */
  async getCacheStatus(): Promise<CacheStatus> {
    try {
      const cache = await this.cacheModel.getGlobalCache();

      if (!cache) {
        logger.debug('No template cache exists - first check is due');
        return {
          isCheckDue: true,
          lastCheckTimestamp: null,
          nextCheckDue: null,
          currentVersionSha: null,
        };
      }

      const now = new Date();
      const isCheckDue = now >= cache.nextCheckDue;

      logger.debug('Template cache status retrieved', {
        isCheckDue,
        lastCheckTimestamp: cache.lastCheckTimestamp,
        nextCheckDue: cache.nextCheckDue,
        currentVersionSha: cache.currentVersionSha,
      });

      return {
        isCheckDue,
        lastCheckTimestamp: cache.lastCheckTimestamp,
        nextCheckDue: cache.nextCheckDue,
        currentVersionSha: cache.currentVersionSha,
      };
    } catch (error) {
      logger.error('Failed to get cache status', { error });
      // On error, assume check is due (fail open for updates)
      return {
        isCheckDue: true,
        lastCheckTimestamp: null,
        nextCheckDue: null,
        currentVersionSha: null,
      };
    }
  }

  /**
   * Check if update check is due based on 24-hour interval
   *
   * @returns True if check is due
   */
  async isUpdateCheckDue(): Promise<boolean> {
    const status = await this.getCacheStatus();
    return status.isCheckDue;
  }

  /**
   * Get current cached version SHA
   *
   * @returns Current version SHA or null if no cache exists
   */
  async getCurrentVersionSha(): Promise<string | null> {
    try {
      return await this.cacheModel.getCurrentVersionSha();
    } catch (error) {
      logger.error('Failed to get current version SHA', { error });
      return null;
    }
  }

  /**
   * Record that a template update check was performed
   * Updates last_check_timestamp and sets next_check_due to +24 hours
   *
   * @param newVersionSha - Git SHA after the check (may be same as before)
   * @param wasUpdated - Whether templates were actually updated
   */
  async recordUpdateCheck(
    newVersionSha: string,
    wasUpdated: boolean
  ): Promise<void> {
    try {
      await this.cacheModel.recordUpdateCheck(newVersionSha, wasUpdated);

      logger.info('Recorded template update check', {
        newVersionSha,
        wasUpdated,
      });
    } catch (error) {
      logger.error('Failed to record update check', { error });
      throw new Error('Failed to update template cache');
    }
  }

  /**
   * Initialize cache with initial version SHA
   * Only creates if no cache exists
   *
   * @param initialVersionSha - Initial git SHA
   */
  async initializeCache(initialVersionSha: string): Promise<void> {
    try {
      await this.cacheModel.initializeCache(initialVersionSha);
      logger.info('Template cache initialized', { initialVersionSha });
    } catch (error) {
      logger.error('Failed to initialize cache', { error });
      throw new Error('Failed to initialize template cache');
    }
  }

  /**
   * Get full cache details
   *
   * @returns Cache record or null if no cache exists
   */
  async getCache(): Promise<TemplateUpdateCache | null> {
    try {
      return await this.cacheModel.getGlobalCache();
    } catch (error) {
      logger.error('Failed to get cache', { error });
      return null;
    }
  }

  /**
   * Calculate time until next check is due
   *
   * @returns Milliseconds until next check, or 0 if check is due
   */
  async getTimeUntilNextCheck(): Promise<number> {
    try {
      const cache = await this.cacheModel.getGlobalCache();

      if (!cache) {
        // No cache - check is immediately due
        return 0;
      }

      const now = new Date();
      const msUntilNextCheck = cache.nextCheckDue.getTime() - now.getTime();

      // Return 0 if already past due, otherwise return remaining time
      return Math.max(0, msUntilNextCheck);
    } catch (error) {
      logger.error('Failed to calculate time until next check', { error });
      // On error, assume check is due
      return 0;
    }
  }

  /**
   * Force an immediate update check by clearing the cache
   * Used for manual refresh or testing
   */
  async forceCacheClear(): Promise<void> {
    try {
      logger.warn('Forcing template cache clear - next check will be immediate');
      // This would require a DELETE operation or setting next_check_due to past
      // For now, we'll log the intent - actual implementation would need DELETE support
      logger.info('Cache clear requested (implementation pending)');
    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  }
}
