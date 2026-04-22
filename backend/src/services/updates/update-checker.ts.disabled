// Template Update Checker Service
// Checks for template updates from central git repository
// Based on specs/001-idea-spec-workflow/spec.md (FR-021, FR-022)

import { GitRepository } from '../../../../shared/utils/git.js';
import { logger } from '../../utils/logger.js';
import { getConfig } from '../../config/env.js';

export interface UpdateCheckResult {
  hasUpdates: boolean;
  latestSha: string;
  currentSha: string | null;
  updatedFiles?: string[];
}

/**
 * Template Update Checker Service
 * Checks central git repository for template updates
 */
export class TemplateUpdateChecker {
  private gitRepo: GitRepository;
  private templateRepoUrl: string;
  private localTemplatePath: string;

  constructor() {
    const config = getConfig();
    if (!config.templates) {
      throw new Error('Templates configuration is missing');
    }
    this.templateRepoUrl = config.templates.repoUrl;
    this.localTemplatePath = config.templates.localPath;
    this.gitRepo = new GitRepository({ repoPath: this.localTemplatePath });
  }

  /**
   * Check for template updates from remote repository
   * Fetches latest commits and compares with current local state
   *
   * @param currentSha - Current local template version SHA
   * @returns Update check result with hasUpdates flag and latest SHA
   */
  async checkForUpdates(currentSha: string | null): Promise<UpdateCheckResult> {
    try {
      logger.debug('Checking for template updates', { currentSha });

      // Ensure local repository exists
      await this.ensureRepository();

      // Fetch latest from remote
      await this.fetchLatest();

      // Get latest commit SHA from remote main/master branch
      const latestSha = await this.getLatestRemoteSha();

      // No current SHA means first check - updates are available
      if (!currentSha) {
        logger.info('First template check - updates available', { latestSha });
        return {
          hasUpdates: true,
          latestSha,
          currentSha: null,
        };
      }

      // Compare current SHA with latest
      const hasUpdates = currentSha !== latestSha;

      if (hasUpdates) {
        // Get list of changed files between current and latest
        const updatedFiles = await this.getChangedFiles(currentSha, latestSha);

        logger.info('Template updates available', {
          currentSha,
          latestSha,
          updatedFilesCount: updatedFiles.length,
        });

        return {
          hasUpdates: true,
          latestSha,
          currentSha,
          updatedFiles,
        };
      }

      logger.debug('Templates are up to date', { latestSha });

      return {
        hasUpdates: false,
        latestSha,
        currentSha,
      };
    } catch (error) {
      logger.error('Failed to check for template updates', { error, currentSha });
      throw new Error('Template update check failed');
    }
  }

  /**
   * Ensure local template repository exists
   * Clones if missing, otherwise does nothing
   */
  private async ensureRepository(): Promise<void> {
    try {
      const exists = await this.gitRepo.repositoryExists();

      if (!exists) {
        logger.info('Cloning template repository', {
          url: this.templateRepoUrl,
          path: this.localTemplatePath,
        });

        // Clone the repository
        await this.gitRepo.clone(this.templateRepoUrl);

        logger.info('Template repository cloned successfully');
      }
    } catch (error) {
      logger.error('Failed to ensure repository exists', { error });
      throw new Error('Failed to initialize template repository');
    }
  }

  /**
   * Fetch latest commits from remote
   */
  private async fetchLatest(): Promise<void> {
    try {
      logger.debug('Fetching latest templates from remote');
      await this.gitRepo.fetch('origin');
    } catch (error) {
      logger.error('Failed to fetch from remote', { error });
      throw new Error('Failed to fetch template updates');
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
      throw new Error('Failed to get latest template version');
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
      // Return empty array on error - non-critical
      return [];
    }
  }

  /**
   * Get current local commit SHA
   */
  async getCurrentLocalSha(): Promise<string> {
    try {
      await this.ensureRepository();
      const sha = await this.gitRepo.getCurrentSha();
      return sha;
    } catch (error) {
      logger.error('Failed to get current local SHA', { error });
      throw new Error('Failed to get current template version');
    }
  }

  /**
   * Validate that a commit SHA exists in the repository
   *
   * @param sha - Commit SHA to validate
   * @returns True if SHA exists
   */
  async validateSha(sha: string): Promise<boolean> {
    try {
      await this.ensureRepository();
      return await this.gitRepo.commitExists(sha);
    } catch (error) {
      logger.error('Failed to validate SHA', { error, sha });
      return false;
    }
  }
}
