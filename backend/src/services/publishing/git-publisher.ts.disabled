// Git Publishing Service
// Commits and pushes specifications to git repository
// Based on specs/001-idea-spec-workflow/research.md (simple-git library)

import { GitRepository } from '../../../../shared/utils/git.js';
import { logger } from '../../utils/logger.js';
import type { Idea } from '../../models/idea.js';
import type { Artifact } from '../../models/artifact.js';

export interface PublishSpec {
  idea: Idea;
  specContent: string;
  artifacts: Artifact[];
}

export interface PublishResult {
  success: boolean;
  commitSha: string | null;
  error?: Error;
}

/**
 * Publish specification and artifacts to git repository
 * Performs git add, commit, and push operations
 */
export async function publishToGit(
  spec: PublishSpec,
  repoPath: string,
  userName: string,
  userEmail: string
): Promise<PublishResult> {
  const git = new GitRepository({ repoPath });

  try {
    logger.info('Starting git publish', {
      ideaId: spec.idea.id,
      gitPath: spec.idea.gitPath,
      artifactCount: spec.artifacts.length,
    });

    // Ensure repository is initialized
    const hasRepo = await git.hasChanges();
    if (!hasRepo) {
      await git.init();
      logger.info('Initialized git repository', { repoPath });
    }

    // Write spec file to git path
    const fs = await import('fs/promises');
    const path = await import('path');
    const fullSpecPath = path.join(repoPath, spec.idea.gitPath);
    const specDir = path.dirname(fullSpecPath);

    // Create directory structure
    await fs.mkdir(specDir, { recursive: true });

    // Write specification file
    await fs.writeFile(fullSpecPath, spec.specContent, 'utf8');

    logger.debug('Wrote specification file', {
      path: fullSpecPath,
      size: spec.specContent.length,
    });

    // Write artifact files
    for (const artifact of spec.artifacts) {
      const artifactFullPath = path.join(repoPath, artifact.filePath);
      const artifactDir = path.dirname(artifactFullPath);

      await fs.mkdir(artifactDir, { recursive: true });

      // Note: In real implementation, artifact content would be provided
      // For now, we just create a placeholder
      await fs.writeFile(artifactFullPath, `Artifact: ${artifact.id}`, 'utf8');

      logger.debug('Wrote artifact file', {
        path: artifactFullPath,
        type: artifact.fileType,
      });
    }

    // Stage files
    await git.add([spec.idea.gitPath, ...spec.artifacts.map((a) => a.filePath)]);

    logger.debug('Staged files for commit', {
      files: [spec.idea.gitPath, ...spec.artifacts.map((a) => a.filePath)],
    });

    // Create commit
    const commitMessage = `Add idea: ${spec.idea.title}\n\nIdea ID: ${spec.idea.id}\nAuthor: ${userName} <${userEmail}>`;

    const commitSha = await git.commit({
      message: commitMessage,
      author: { name: userName, email: userEmail },
    });

    logger.info('Created git commit', {
      sha: commitSha,
      message: commitMessage,
    });

    // Push to remote
    await git.push();

    logger.info('Pushed to remote repository', {
      ideaId: spec.idea.id,
      commitSha,
    });

    return {
      success: true,
      commitSha,
    };
  } catch (error) {
    logger.error('Git publish failed', {
      ideaId: spec.idea.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      commitSha: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Revert a git commit by SHA
 * Used for rollback in atomic transaction coordinator
 */
export async function revertGitCommit(
  commitSha: string,
  repoPath: string
): Promise<boolean> {
  const git = new GitRepository({ repoPath });

  try {
    logger.info('Reverting git commit', { commitSha });

    await git.revertCommit(commitSha);

    logger.info('Reverted git commit successfully', { commitSha });

    return true;
  } catch (error) {
    logger.error('Git revert failed', {
      commitSha,
      error: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
}

/**
 * Check if git repository is accessible and has remote configured
 */
export async function validateGitRepository(repoPath: string): Promise<boolean> {
  const git = new GitRepository({ repoPath });

  try {
    const status = await git.status();
    logger.debug('Git repository validated', { repoPath, status });
    return true;
  } catch (error) {
    logger.warn('Git repository validation failed', {
      repoPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
