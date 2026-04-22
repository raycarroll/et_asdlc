// Rollback Handlers
// Compensating transactions for atomic publish failures
// Based on specs/001-idea-spec-workflow/research.md (Saga pattern)

import { logger } from '../../utils/logger.js';
import type { Pool } from 'pg';
import { revertGitCommit as gitRevert } from './git-publisher.js';
import { deleteFromDatabase as dbDelete } from './db-registrar.js';

export interface RollbackContext {
  ideaId: string;
  commitSha: string | null;
  repoPath: string;
  operation: 'git' | 'database' | 'both';
}

export interface RollbackResult {
  success: boolean;
  gitReverted: boolean;
  databaseDeleted: boolean;
  error?: string;
}

/**
 * Execute rollback based on context
 * Determines which operations need to be reversed
 */
export async function executeRollback(
  context: RollbackContext,
  pool: Pool
): Promise<RollbackResult> {
  logger.info('Executing rollback', {
    ideaId: context.ideaId,
    operation: context.operation,
    commitSha: context.commitSha,
  });

  const result: RollbackResult = {
    success: true,
    gitReverted: false,
    databaseDeleted: false,
  };

  // Rollback git if needed
  if (
    (context.operation === 'git' || context.operation === 'both') &&
    context.commitSha
  ) {
    const gitSuccess = await rollbackGit(context.commitSha, context.repoPath);

    result.gitReverted = gitSuccess;

    if (!gitSuccess) {
      result.success = false;
      result.error = `Git rollback failed for commit ${context.commitSha}`;
      logger.error('Git rollback failed', {
        commitSha: context.commitSha,
        ideaId: context.ideaId,
      });
    }
  }

  // Rollback database if needed
  if (context.operation === 'database' || context.operation === 'both') {
    const dbSuccess = await rollbackDatabase(context.ideaId, pool);

    result.databaseDeleted = dbSuccess;

    if (!dbSuccess) {
      result.success = false;
      result.error = result.error
        ? `${result.error}; Database rollback also failed`
        : `Database rollback failed for idea ${context.ideaId}`;
      logger.error('Database rollback failed', {
        ideaId: context.ideaId,
      });
    }
  }

  if (result.success) {
    logger.info('Rollback completed successfully', {
      ideaId: context.ideaId,
      gitReverted: result.gitReverted,
      databaseDeleted: result.databaseDeleted,
    });
  } else {
    logger.error('Rollback failed - manual intervention may be required', {
      ideaId: context.ideaId,
      error: result.error,
    });
  }

  return result;
}

/**
 * Rollback git commit
 */
async function rollbackGit(
  commitSha: string,
  repoPath: string
): Promise<boolean> {
  logger.debug('Rolling back git commit', { commitSha });

  try {
    const success = await gitRevert(commitSha, repoPath);

    if (success) {
      logger.info('Git commit reverted', { commitSha });
    }

    return success;
  } catch (error) {
    logger.error('Exception during git rollback', {
      commitSha,
      error: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
}

/**
 * Rollback database entries
 */
async function rollbackDatabase(ideaId: string, pool: Pool): Promise<boolean> {
  logger.debug('Rolling back database entries', { ideaId });

  try {
    const success = await dbDelete(ideaId, pool);

    if (success) {
      logger.info('Database entries deleted', { ideaId });
    }

    return success;
  } catch (error) {
    logger.error('Exception during database rollback', {
      ideaId,
      error: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
}

/**
 * Create rollback context for failed git operation
 */
export function createGitRollbackContext(
  ideaId: string,
  commitSha: string,
  repoPath: string
): RollbackContext {
  return {
    ideaId,
    commitSha,
    repoPath,
    operation: 'git',
  };
}

/**
 * Create rollback context for failed database operation
 */
export function createDatabaseRollbackContext(
  ideaId: string,
  repoPath: string
): RollbackContext {
  return {
    ideaId,
    commitSha: null,
    repoPath,
    operation: 'database',
  };
}

/**
 * Create rollback context for failed dual operation
 */
export function createFullRollbackContext(
  ideaId: string,
  commitSha: string | null,
  repoPath: string
): RollbackContext {
  return {
    ideaId,
    commitSha,
    repoPath,
    operation: 'both',
  };
}

/**
 * Check if rollback is needed based on partial success
 */
export function needsRollback(
  gitSuccess: boolean,
  dbSuccess: boolean
): boolean {
  // If both succeeded or both failed from the start, no rollback needed
  if (gitSuccess === dbSuccess) {
    return false;
  }

  // If git succeeded but database failed, or vice versa, rollback is needed
  return true;
}
