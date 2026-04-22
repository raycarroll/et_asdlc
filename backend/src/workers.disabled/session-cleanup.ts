// Session Cleanup Worker
// Based on FR-016: Clean up completed or abandoned session state files after retention period

import { cleanupExpiredSessions } from '../services/validation/session-storage.js';
import { logger } from '../utils/logger.js';

export interface SessionCleanupConfig {
  intervalMinutes?: number; // How often to run cleanup (default: 60 minutes)
}

/**
 * Run session cleanup once
 */
export async function runCleanup(): Promise<number> {
  try {
    logger.info('Running session cleanup...');

    const deletedCount = await cleanupExpiredSessions();

    if (deletedCount > 0) {
      logger.info('Session cleanup completed', {
        deletedCount,
      });
    } else {
      logger.debug('Session cleanup completed - no expired sessions found');
    }

    return deletedCount;
  } catch (error) {
    logger.error('Session cleanup failed', error as Error);
    return 0;
  }
}

/**
 * Start periodic session cleanup worker
 */
export function startCleanupWorker(config?: SessionCleanupConfig): NodeJS.Timeout {
  const intervalMinutes = config?.intervalMinutes || 60;
  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info('Starting session cleanup worker', {
    intervalMinutes,
  });

  // Run immediately on start
  runCleanup().catch((error) => {
    logger.error('Initial cleanup run failed', error as Error);
  });

  // Then run periodically
  const intervalId = setInterval(() => {
    runCleanup().catch((error) => {
      logger.error('Periodic cleanup run failed', error as Error);
    });
  }, intervalMs);

  // Return interval ID so it can be stopped if needed
  return intervalId;
}

/**
 * Stop cleanup worker
 */
export function stopCleanupWorker(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.info('Session cleanup worker stopped');
}

// If this file is run directly, start the worker
if (require.main === module) {
  const config: SessionCleanupConfig = {
    intervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60', 10),
  };

  startCleanupWorker(config);

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal, stopping cleanup worker');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('Received SIGINT signal, stopping cleanup worker');
    process.exit(0);
  });
}
