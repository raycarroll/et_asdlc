// Template Git Commit Service
// Commit admin edits with identity tracking
// Based on specs/001-idea-spec-workflow/spec.md (FR-015f)

import { logger } from '../../utils/logger.js';
import { simpleGit, type SimpleGit } from 'simple-git';

/**
 * Commit template change to git repository
 * Returns the commit SHA
 */
export async function commitTemplateChange(
  filePath: string,
  content: string,
  authorEmail: string,
  authorId: string,
  repoPath: string
): Promise<string> {
  logger.info('Committing template change', {
    filePath,
    authorEmail,
    authorId,
  });

  try {
    const git: SimpleGit = simpleGit(repoPath);

    // Configure git user for this commit
    await git.addConfig('user.email', authorEmail);
    await git.addConfig('user.name', authorEmail.split('@')[0]);

    // Stage the modified file
    await git.add(filePath);

    // Create commit message
    const commitMessage = `Update template: ${filePath}

Modified by: ${authorEmail} (${authorId})
Timestamp: ${new Date().toISOString()}

Template updated via web interface.`;

    // Commit the change
    const commitResult = await git.commit(commitMessage);

    const commitSha = commitResult.commit;

    logger.info('Template change committed', {
      filePath,
      commitSha,
      authorEmail,
    });

    return commitSha;
  } catch (error) {
    logger.error('Failed to commit template change', {
      filePath,
      authorEmail,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error(
      `Failed to commit template change: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get template change history from git
 */
export async function getTemplateHistory(
  filePath: string,
  repoPath: string,
  limit: number = 10
): Promise<
  Array<{
    sha: string;
    author: string;
    date: Date;
    message: string;
  }>
> {
  logger.debug('Fetching template history', {
    filePath,
    limit,
  });

  try {
    const git: SimpleGit = simpleGit(repoPath);

    // Get log for specific file
    const log = await git.log({
      file: filePath,
      maxCount: limit,
    });

    const history = log.all.map((commit) => ({
      sha: commit.hash,
      author: commit.author_email,
      date: new Date(commit.date),
      message: commit.message,
    }));

    logger.debug('Template history fetched', {
      filePath,
      commitCount: history.length,
    });

    return history;
  } catch (error) {
    logger.error('Failed to fetch template history', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error(
      `Failed to fetch template history: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get template content at specific commit
 */
export async function getTemplateAtCommit(
  filePath: string,
  commitSha: string,
  repoPath: string
): Promise<string> {
  logger.debug('Fetching template at commit', {
    filePath,
    commitSha,
  });

  try {
    const git: SimpleGit = simpleGit(repoPath);

    // Get file content at specific commit
    const content = await git.show([`${commitSha}:${filePath}`]);

    logger.debug('Template content fetched', {
      filePath,
      commitSha,
    });

    return content;
  } catch (error) {
    logger.error('Failed to fetch template at commit', {
      filePath,
      commitSha,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error(
      `Failed to fetch template at commit: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Revert template to previous version
 */
export async function revertTemplateToCommit(
  filePath: string,
  commitSha: string,
  authorEmail: string,
  authorId: string,
  repoPath: string
): Promise<string> {
  logger.info('Reverting template to commit', {
    filePath,
    commitSha,
    authorEmail,
  });

  try {
    // Get content at target commit
    const content = await getTemplateAtCommit(filePath, commitSha, repoPath);

    // Commit the reverted content
    const newCommitSha = await commitTemplateChange(
      filePath,
      content,
      authorEmail,
      authorId,
      repoPath
    );

    logger.info('Template reverted successfully', {
      filePath,
      targetCommit: commitSha,
      newCommit: newCommitSha,
    });

    return newCommitSha;
  } catch (error) {
    logger.error('Failed to revert template', {
      filePath,
      commitSha,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error(
      `Failed to revert template: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if there are uncommitted changes in the repository
 */
export async function hasUncommittedChanges(
  repoPath: string
): Promise<boolean> {
  try {
    const git: SimpleGit = simpleGit(repoPath);

    const status = await git.status();

    return !status.isClean();
  } catch (error) {
    logger.error('Failed to check repository status', {
      repoPath,
      error: error instanceof Error ? error.message : String(error),
    });

    return false;
  }
}
