// Template Download Service
// Fetches and overwrites local templates from remote repository
// Based on specs/001-idea-spec-workflow/spec.md (FR-024, FR-025)

import { GitRepository } from '../../../../shared/utils/git.js';
import { logger } from '../../utils/logger.js';
import { getConfig } from '../../config/env.js';

export interface DownloadResult {
  success: boolean;
  newVersionSha: string;
  updatedFiles: string[];
  error?: string;
}

/**
 * Template Download Service
 * Downloads latest templates from remote git repository
 */
export class TemplateDownloadService {
  private gitRepo: GitRepository;
  private localTemplatePath: string;

  constructor() {
    const config = getConfig();
    if (!config.templates) {
      throw new Error('Templates configuration is missing');
    }
    this.localTemplatePath = config.templates.localPath;
    this.gitRepo = new GitRepository({ repoPath: this.localTemplatePath });
  }

  /**
   * Download latest templates from remote repository
   * Overwrites local templates with remote versions (remote always wins)
   *
   * @param targetSha - Specific commit SHA to download (defaults to latest)
   * @returns Download result with success status and updated files list
   */
  async downloadTemplates(targetSha?: string): Promise<DownloadResult> {
    try {
      logger.info('Starting template download', { targetSha });

      // Ensure repository exists
      const exists = await this.gitRepo.repositoryExists();
      if (!exists) {
        throw new Error('Template repository does not exist - cannot download');
      }

      // Fetch latest from remote
      await this.gitRepo.fetch('origin');

      // Determine target SHA (latest if not specified)
      const actualTargetSha = targetSha || (await this.getLatestRemoteSha());

      // Get list of changed files before pulling
      const currentSha = await this.gitRepo.getCurrentSha();
      const changedFiles = await this.getChangedFiles(currentSha, actualTargetSha);

      // Reset local to remote state (overwrites local changes)
      await this.resetToRemote(actualTargetSha);

      logger.info('Templates downloaded successfully', {
        newVersionSha: actualTargetSha,
        updatedFilesCount: changedFiles.length,
      });

      return {
        success: true,
        newVersionSha: actualTargetSha,
        updatedFiles: changedFiles,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to download templates', { error, targetSha });

      return {
        success: false,
        newVersionSha: '',
        updatedFiles: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Reset local repository to match remote state
   * This implements "remote always wins" conflict resolution
   *
   * @param targetSha - Commit SHA to reset to
   */
  private async resetToRemote(targetSha: string): Promise<void> {
    try {
      logger.debug('Resetting local repository to remote state', { targetSha });

      // Hard reset to target SHA (discards local changes)
      await this.gitRepo.reset(targetSha, 'hard');

      logger.info('Local repository reset to remote state', { targetSha });
    } catch (error) {
      logger.error('Failed to reset to remote', { error, targetSha });
      throw new Error('Failed to update local templates');
    }
  }

  /**
   * Get latest commit SHA from remote main/master branch
   */
  private async getLatestRemoteSha(): Promise<string> {
    try {
      // Try origin/main first, fallback to origin/master
      let remoteSha: string;

      try {
        remoteSha = await this.gitRepo.getCommitSha('origin/main');
      } catch {
        // Fallback to master if main doesn't exist
        remoteSha = await this.gitRepo.getCommitSha('origin/master');
      }

      return remoteSha;
    } catch (error) {
      logger.error('Failed to get latest remote SHA', { error });
      throw new Error('Failed to determine latest template version');
    }
  }

  /**
   * Get list of files changed between two commits
   *
   * @param fromSha - Old commit SHA
   * @param toSha - New commit SHA
   * @returns Array of changed file paths
   */
  private async getChangedFiles(fromSha: string, toSha: string): Promise<string[]> {
    try {
      const files = await this.gitRepo.getChangedFiles(fromSha, toSha);
      return files;
    } catch (error) {
      logger.error('Failed to get changed files', { error, fromSha, toSha });
      // Return empty array on error - non-critical for download
      return [];
    }
  }

  /**
   * Verify download integrity by checking current SHA matches expected
   *
   * @param expectedSha - Expected commit SHA after download
   * @returns True if current SHA matches expected
   */
  async verifyDownload(expectedSha: string): Promise<boolean> {
    try {
      const currentSha = await this.gitRepo.getCurrentSha();
      const matches = currentSha === expectedSha;

      if (!matches) {
        logger.warn('Download verification failed', {
          expectedSha,
          actualSha: currentSha,
        });
      }

      return matches;
    } catch (error) {
      logger.error('Failed to verify download', { error, expectedSha });
      return false;
    }
  }

  /**
   * Get current local version SHA
   */
  async getCurrentLocalSha(): Promise<string> {
    try {
      return await this.gitRepo.getCurrentSha();
    } catch (error) {
      logger.error('Failed to get current local SHA', { error });
      throw new Error('Failed to get current template version');
    }
  }

  /**
   * Check if local repository has uncommitted changes
   * Useful for detecting manual template edits
   */
  async hasLocalChanges(): Promise<boolean> {
    try {
      const status = await this.gitRepo.status();
      return !status.isClean;
    } catch (error) {
      logger.error('Failed to check local changes', { error });
      return false;
    }
  }

  /**
   * Backup current templates before download
   * Creates a git tag for the current state
   *
   * @param tagName - Name for backup tag (e.g., "backup-before-update-2026-04-22")
   */
  async createBackupTag(tagName: string): Promise<void> {
    try {
      const currentSha = await this.gitRepo.getCurrentSha();

      logger.info('Creating backup tag', { tagName, sha: currentSha });

      await this.gitRepo.tag(tagName, currentSha);

      logger.info('Backup tag created successfully', { tagName });
    } catch (error) {
      logger.warn('Failed to create backup tag', { error, tagName });
      // Non-critical failure - don't throw
    }
  }
}
