// Template Sync Worker
// Background worker for periodic template updates
// Based on specs/001-idea-spec-workflow/spec.md (FR-022, FR-023)

import { Pool } from 'pg';
import { TemplateCacheService } from '../services/updates/cache.js';
import { TemplateUpdateChecker } from '../services/updates/update-checker.js';
import { TemplateDownloadService } from '../services/updates/downloader.js';
import { TemplateUpdateNotifier } from '../services/updates/notifier.js';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config/env.js';

/**
 * Template Sync Worker
 * Runs in background to periodically check for and download template updates
 */
export class TemplateSyncWorker {
  private pool: Pool;
  private cacheService: TemplateCacheService;
  private updateChecker: TemplateUpdateChecker;
  private downloader: TemplateDownloadService;
  private notifier: TemplateUpdateNotifier;
  private intervalMs: number;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(pool: Pool, intervalMs: number = 60 * 60 * 1000) {
    // Default to 1 hour check interval (24-hour enforcement is in cache service)
    this.pool = pool;
    this.cacheService = new TemplateCacheService(pool);
    this.updateChecker = new TemplateUpdateChecker();
    this.downloader = new TemplateDownloadService();
    this.notifier = new TemplateUpdateNotifier();
    this.intervalMs = intervalMs;
  }

  /**
   * Start the worker to run periodic template sync checks
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Template sync worker already running');
      return;
    }

    this.isRunning = true;

    logger.info('Starting template sync worker', {
      intervalMs: this.intervalMs,
      intervalMinutes: this.intervalMs / (60 * 1000),
    });

    // Run immediately on start
    this.runSync().catch((error) => {
      logger.error('Initial template sync failed', { error });
    });

    // Schedule periodic runs
    this.intervalHandle = setInterval(() => {
      this.runSync().catch((error) => {
        logger.error('Periodic template sync failed', { error });
      });
    }, this.intervalMs);
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Template sync worker not running');
      return;
    }

    logger.info('Stopping template sync worker');

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.isRunning = false;
  }

  /**
   * Run a single sync check cycle
   */
  private async runSync(): Promise<void> {
    try {
      logger.debug('Template sync cycle starting');

      // Check if update check is due (24-hour interval enforced by cache)
      const status = await this.cacheService.getCacheStatus();

      if (!status.isCheckDue) {
        logger.debug('Template update check not due yet', {
          nextCheckDue: status.nextCheckDue,
          currentVersionSha: status.currentVersionSha,
        });
        return;
      }

      logger.info('Template update check due - checking for updates');

      // Check for updates
      const checkResult = await this.updateChecker.checkForUpdates(
        status.currentVersionSha
      );

      if (!checkResult.hasUpdates) {
        // No updates - record check and continue
        await this.cacheService.recordUpdateCheck(checkResult.latestSha, false);

        logger.debug('No template updates available', {
          latestSha: checkResult.latestSha,
        });

        return;
      }

      // Updates available - download them
      logger.info('Template updates available - downloading', {
        currentSha: checkResult.currentSha,
        latestSha: checkResult.latestSha,
        updatedFilesCount: checkResult.updatedFiles?.length || 0,
      });

      const downloadResult = await this.downloader.downloadTemplates(
        checkResult.latestSha
      );

      if (!downloadResult.success) {
        // Download failed - log warning and continue
        logger.warn('Template download failed in background worker', {
          error: downloadResult.error,
        });

        // Record check even though download failed
        await this.cacheService.recordUpdateCheck(
          status.currentVersionSha || checkResult.latestSha,
          false
        );

        return;
      }

      // Download successful - record update
      await this.cacheService.recordUpdateCheck(downloadResult.newVersionSha, true);

      logger.info('Background template update completed successfully', {
        previousVersion: checkResult.currentSha,
        newVersion: downloadResult.newVersionSha,
        updatedFilesCount: downloadResult.updatedFiles.length,
      });

      // Note: Notifications are not displayed in background worker
      // They will be shown on next user command execution
    } catch (error) {
      logger.error('Template sync cycle failed', { error });
      // Don't re-throw - worker should continue running
    }
  }

  /**
   * Force an immediate sync check (bypasses 24-hour interval)
   * Useful for manual refresh or testing
   */
  async forceSync(): Promise<void> {
    logger.info('Forcing immediate template sync');

    try {
      const currentSha = await this.cacheService.getCurrentVersionSha();
      const checkResult = await this.updateChecker.checkForUpdates(currentSha);

      if (!checkResult.hasUpdates) {
        logger.info('No updates available', { latestSha: checkResult.latestSha });
        return;
      }

      const downloadResult = await this.downloader.downloadTemplates(
        checkResult.latestSha
      );

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Download failed');
      }

      await this.cacheService.recordUpdateCheck(downloadResult.newVersionSha, true);

      logger.info('Forced template sync completed', {
        previousVersion: checkResult.currentSha,
        newVersion: downloadResult.newVersionSha,
      });
    } catch (error) {
      logger.error('Forced sync failed', { error });
      throw error;
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    intervalMs: number;
    nextCheckDue: Date | null;
    currentVersionSha: string | null;
  } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      nextCheckDue: null, // Would need to query cache service
      currentVersionSha: null, // Would need to query cache service
    };
  }
}

/**
 * Create and start a template sync worker
 * Typically called from server startup
 */
export async function startTemplateSyncWorker(
  pool: Pool,
  intervalMs?: number
): Promise<TemplateSyncWorker> {
  const config = getConfig();

  // Use configured interval or default
  const actualIntervalMs = intervalMs || config.workers?.templateSyncIntervalMs || 60 * 60 * 1000;

  const worker = new TemplateSyncWorker(pool, actualIntervalMs);
  worker.start();

  logger.info('Template sync worker started', {
    intervalMs: actualIntervalMs,
    intervalHours: actualIntervalMs / (60 * 60 * 1000),
  });

  return worker;
}

/**
 * Stop a running template sync worker
 */
export function stopTemplateSyncWorker(worker: TemplateSyncWorker): void {
  worker.stop();
  logger.info('Template sync worker stopped');
}
