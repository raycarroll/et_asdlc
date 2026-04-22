// Atomic Transaction Coordinator
// Implements Saga pattern for atomic git + database dual-write
// Based on specs/001-idea-spec-workflow/research.md

import { logger } from '../../utils/logger.js';
import type { Pool } from 'pg';
import type { Idea } from '../../models/idea.js';
import type { Artifact } from '../../models/artifact.js';
import { extractMetadata, validateMetadata } from './metadata-extractor.js';
import { publishToGit, revertGitCommit } from './git-publisher.js';
import { registerInDatabase, deleteFromDatabase } from './db-registrar.js';

export interface PublishRequest {
  idea: Idea;
  specContent: string;
  artifacts: Artifact[];
  userName: string;
  userEmail: string;
  repoPath: string;
}

export interface PublishResponse {
  success: boolean;
  commitSha: string | null;
  ideaId: string | null;
  error?: string;
  rollbackPerformed?: boolean;
}

/**
 * Atomic publish coordinator using Saga pattern
 * Executes git push and database registration with compensating transactions
 *
 * Flow:
 * 1. Extract and validate metadata
 * 2. Publish to git
 * 3. If git succeeds: Register in database
 * 4. If database fails: Revert git commit (compensation)
 * 5. If both succeed: Return success
 */
export async function atomicPublish(
  request: PublishRequest,
  pool: Pool
): Promise<PublishResponse> {
  logger.info('Starting atomic publish', {
    ideaId: request.idea.id,
    title: request.idea.title,
  });

  // Step 1: Extract and validate metadata
  const metadata = extractMetadata(request.specContent);

  if (!validateMetadata(metadata)) {
    logger.error('Metadata validation failed', { ideaId: request.idea.id });
    return {
      success: false,
      commitSha: null,
      ideaId: null,
      error: 'Invalid metadata extracted from specification',
    };
  }

  logger.debug('Metadata validated', {
    ideaId: request.idea.id,
    tagCount: metadata.tags.length,
  });

  // Step 2: Publish to git (first operation)
  const gitResult = await publishToGit(
    {
      idea: request.idea,
      specContent: request.specContent,
      artifacts: request.artifacts,
    },
    request.repoPath,
    request.userName,
    request.userEmail
  );

  if (!gitResult.success) {
    logger.error('Git publish failed', {
      ideaId: request.idea.id,
      error: gitResult.error?.message,
    });

    return {
      success: false,
      commitSha: null,
      ideaId: null,
      error: `Git publish failed: ${gitResult.error?.message || 'Unknown error'}`,
    };
  }

  logger.info('Git publish succeeded', {
    ideaId: request.idea.id,
    commitSha: gitResult.commitSha,
  });

  // Update idea with commit SHA
  const ideaWithCommit: Idea = {
    ...request.idea,
    gitCommitSha: gitResult.commitSha,
    status: 'published',
    publishedAt: new Date(),
  };

  // Step 3: Register in database (second operation)
  const dbResult = await registerInDatabase(
    {
      idea: ideaWithCommit,
      metadata,
      artifacts: request.artifacts,
    },
    pool
  );

  if (!dbResult.success) {
    logger.error('Database registration failed, attempting rollback', {
      ideaId: request.idea.id,
      commitSha: gitResult.commitSha,
      error: dbResult.error?.message,
    });

    // Step 4: Compensation - revert git commit
    if (gitResult.commitSha) {
      const revertSuccess = await revertGitCommit(
        gitResult.commitSha,
        request.repoPath
      );

      if (revertSuccess) {
        logger.info('Git commit reverted successfully', {
          ideaId: request.idea.id,
          commitSha: gitResult.commitSha,
        });

        return {
          success: false,
          commitSha: null,
          ideaId: null,
          error: `Database registration failed: ${dbResult.error?.message || 'Unknown error'}. Git commit reverted.`,
          rollbackPerformed: true,
        };
      } else {
        logger.error('Git rollback failed - manual intervention required', {
          ideaId: request.idea.id,
          commitSha: gitResult.commitSha,
        });

        return {
          success: false,
          commitSha: gitResult.commitSha,
          ideaId: null,
          error: `Database registration failed AND git rollback failed. Manual cleanup required for commit ${gitResult.commitSha}`,
          rollbackPerformed: false,
        };
      }
    }

    return {
      success: false,
      commitSha: null,
      ideaId: null,
      error: `Database registration failed: ${dbResult.error?.message || 'Unknown error'}`,
    };
  }

  // Step 5: Both operations succeeded
  logger.info('Atomic publish succeeded', {
    ideaId: dbResult.ideaId,
    commitSha: gitResult.commitSha,
    metadataId: dbResult.metadataId,
    artifactCount: dbResult.artifactIds.length,
  });

  return {
    success: true,
    commitSha: gitResult.commitSha,
    ideaId: dbResult.ideaId,
  };
}

/**
 * Unpublish an idea (rollback both git and database)
 * Used for user-initiated deletions or admin actions
 */
export async function atomicUnpublish(
  ideaId: string,
  commitSha: string,
  repoPath: string,
  pool: Pool
): Promise<PublishResponse> {
  logger.info('Starting atomic unpublish', { ideaId, commitSha });

  // Step 1: Delete from database
  const dbDeleted = await deleteFromDatabase(ideaId, pool);

  if (!dbDeleted) {
    logger.error('Database deletion failed', { ideaId });
    return {
      success: false,
      commitSha: null,
      ideaId: null,
      error: 'Failed to delete from database',
    };
  }

  logger.info('Database deletion succeeded', { ideaId });

  // Step 2: Revert git commit
  const gitReverted = await revertGitCommit(commitSha, repoPath);

  if (!gitReverted) {
    logger.error('Git revert failed after database deletion', {
      ideaId,
      commitSha,
    });

    // Database is already deleted, can't rollback
    return {
      success: false,
      commitSha,
      ideaId,
      error: `Database deleted but git revert failed. Manual cleanup required for commit ${commitSha}`,
      rollbackPerformed: false,
    };
  }

  logger.info('Atomic unpublish succeeded', { ideaId, commitSha });

  return {
    success: true,
    commitSha: null,
    ideaId,
  };
}

/**
 * Check if idea can be published (validation checks)
 */
export async function canPublish(idea: Idea): Promise<{
  canPublish: boolean;
  reason?: string;
}> {
  // Check idea is in draft status
  if (idea.status !== 'draft') {
    return {
      canPublish: false,
      reason: `Idea is not in draft status (current: ${idea.status})`,
    };
  }

  // Check required fields
  if (!idea.title || idea.title.length < 3) {
    return {
      canPublish: false,
      reason: 'Idea title is too short (minimum 3 characters)',
    };
  }

  if (!idea.gitPath) {
    return {
      canPublish: false,
      reason: 'Git path is not configured',
    };
  }

  return {
    canPublish: true,
  };
}
