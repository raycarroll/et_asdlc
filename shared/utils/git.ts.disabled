// Git Operations Utility
// Based on research.md: Uses simple-git library for git operations

import simpleGit, { type SimpleGit, type SimpleGitOptions } from 'simple-git';
import { logger } from '../../backend/src/utils/logger.js';

export interface GitConfig {
  repoPath: string;
  remoteUrl?: string;
}

export interface CommitOptions {
  message: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface PushOptions {
  remote?: string;
  branch?: string;
  force?: boolean;
}

/**
 * Git operations wrapper using simple-git
 */
export class GitRepository {
  private git: SimpleGit;
  private repoPath: string;

  constructor(config: GitConfig) {
    this.repoPath = config.repoPath;
    const options: Partial<SimpleGitOptions> = {
      baseDir: config.repoPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
    };
    this.git = simpleGit(options);
  }

  /**
   * Initialize a new git repository
   */
  async init(): Promise<void> {
    try {
      await this.git.init();
      logger.info('Git repository initialized', { path: this.repoPath });
    } catch (error) {
      logger.error('Failed to initialize git repository', error as Error, {
        path: this.repoPath,
      });
      throw error;
    }
  }

  /**
   * Clone a remote repository
   */
  async clone(remoteUrl: string): Promise<void> {
    try {
      await simpleGit().clone(remoteUrl, this.repoPath);
      logger.info('Repository cloned', { url: remoteUrl, path: this.repoPath });
    } catch (error) {
      logger.error('Failed to clone repository', error as Error, {
        url: remoteUrl,
        path: this.repoPath,
      });
      throw error;
    }
  }

  /**
   * Add files to staging area
   */
  async add(files: string | string[]): Promise<void> {
    try {
      await this.git.add(files);
      logger.debug('Files added to staging', { files });
    } catch (error) {
      logger.error('Failed to add files', error as Error, { files });
      throw error;
    }
  }

  /**
   * Commit changes
   */
  async commit(options: CommitOptions): Promise<string> {
    try {
      if (options.author) {
        await this.git.addConfig('user.name', options.author.name);
        await this.git.addConfig('user.email', options.author.email);
      }

      const result = await this.git.commit(options.message);
      const commitSha = result.commit;

      logger.info('Changes committed', {
        sha: commitSha,
        message: options.message,
      });

      return commitSha;
    } catch (error) {
      logger.error('Failed to commit changes', error as Error, {
        message: options.message,
      });
      throw error;
    }
  }

  /**
   * Push commits to remote
   */
  async push(options: PushOptions = {}): Promise<void> {
    try {
      const remote = options.remote || 'origin';
      const branch = options.branch || 'main';

      if (options.force) {
        await this.git.push(remote, branch, ['--force']);
      } else {
        await this.git.push(remote, branch);
      }

      logger.info('Changes pushed to remote', { remote, branch });
    } catch (error) {
      logger.error('Failed to push changes', error as Error, {
        remote: options.remote,
        branch: options.branch,
      });
      throw error;
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(remote: string = 'origin', branch: string = 'main'): Promise<void> {
    try {
      await this.git.pull(remote, branch);
      logger.info('Changes pulled from remote', { remote, branch });
    } catch (error) {
      logger.error('Failed to pull changes', error as Error, { remote, branch });
      throw error;
    }
  }

  /**
   * Get current commit SHA
   */
  async getCurrentSha(): Promise<string> {
    try {
      const result = await this.git.revparse(['HEAD']);
      return result.trim();
    } catch (error) {
      logger.error('Failed to get current SHA', error as Error);
      throw error;
    }
  }

  /**
   * Revert a commit (for atomic transaction rollback)
   */
  async revertCommit(commitSha: string): Promise<void> {
    try {
      await this.git.revert(commitSha, { '--no-edit': null });
      logger.info('Commit reverted', { sha: commitSha });
    } catch (error) {
      logger.error('Failed to revert commit', error as Error, { sha: commitSha });
      throw error;
    }
  }

  /**
   * Check if repository has uncommitted changes
   */
  async hasChanges(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return !status.isClean();
    } catch (error) {
      logger.error('Failed to check repository status', error as Error);
      throw error;
    }
  }

  /**
   * Get repository status
   */
  async status(): Promise<{
    isClean: boolean;
    modified: string[];
    created: string[];
    deleted: string[];
  }> {
    try {
      const status = await this.git.status();
      return {
        isClean: status.isClean(),
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
      };
    } catch (error) {
      logger.error('Failed to get repository status', error as Error);
      throw error;
    }
  }

  /**
   * Fetch latest changes from remote
   */
  async fetch(remote: string = 'origin'): Promise<void> {
    try {
      await this.git.fetch(remote);
      logger.debug('Fetched from remote', { remote });
    } catch (error) {
      logger.error('Failed to fetch from remote', error as Error, { remote });
      throw error;
    }
  }

  /**
   * Check if local is behind remote
   */
  async isBehindRemote(branch: string = 'main'): Promise<boolean> {
    try {
      await this.fetch();
      const status = await this.git.status();
      return status.behind > 0;
    } catch (error) {
      logger.error('Failed to check remote status', error as Error);
      throw error;
    }
  }

  /**
   * Check if repository exists
   */
  async repositoryExists(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset repository to a specific commit
   */
  async reset(commitSha: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
    try {
      await this.git.reset([`--${mode}`, commitSha]);
      logger.info('Repository reset', { sha: commitSha, mode });
    } catch (error) {
      logger.error('Failed to reset repository', error as Error, { sha: commitSha, mode });
      throw error;
    }
  }

  /**
   * Get commit SHA for a reference (branch, tag, etc.)
   */
  async getCommitSha(ref: string): Promise<string> {
    try {
      const result = await this.git.revparse([ref]);
      return result.trim();
    } catch (error) {
      logger.error('Failed to get commit SHA', error as Error, { ref });
      throw error;
    }
  }

  /**
   * Get list of files changed between two commits
   */
  async getChangedFiles(fromSha: string, toSha: string): Promise<string[]> {
    try {
      const result = await this.git.diff([fromSha, toSha, '--name-only']);
      return result.split('\n').filter(Boolean);
    } catch (error) {
      logger.error('Failed to get changed files', error as Error, { fromSha, toSha });
      throw error;
    }
  }

  /**
   * Create a git tag
   */
  async tag(tagName: string, commitSha?: string): Promise<void> {
    try {
      if (commitSha) {
        await this.git.tag([tagName, commitSha]);
      } else {
        await this.git.tag([tagName]);
      }
      logger.info('Tag created', { tag: tagName, sha: commitSha });
    } catch (error) {
      logger.error('Failed to create tag', error as Error, { tag: tagName });
      throw error;
    }
  }

  /**
   * Check if a commit exists in the repository
   */
  async commitExists(commitSha: string): Promise<boolean> {
    try {
      await this.git.revparse([commitSha]);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a GitRepository instance
 */
export function createGitRepository(config: GitConfig): GitRepository {
  return new GitRepository(config);
}
