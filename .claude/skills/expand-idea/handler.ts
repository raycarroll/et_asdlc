// Expand Idea Skill Handler
// Orchestrates the validation workflow (FR-002 through FR-008)

import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { createSession } from '../../../backend/src/models/session.js';
import {
  loadDefaultGuideline,
  type GuidelineLoaderConfig,
} from '../../../backend/src/services/validation/guideline-loader.js';
import {
  initializeConversation,
  processAnswer,
  getConversationSummary,
  type ConversationState,
} from '../../../backend/src/services/validation/conversation-manager.js';
import {
  generateQuestionDisplay,
  validateAnswer,
} from '../../../backend/src/services/validation/question-presenter.js';
import {
  saveSession,
  loadSession,
} from '../../../backend/src/services/validation/session-storage.js';
import {
  renderFromResponses,
  validateRenderedSpec,
  type TemplateRendererConfig,
} from '../../../backend/src/services/template/renderer.js';
import { logger } from '../../../backend/src/utils/logger.js';
import { Pool } from 'pg';
import { TemplateCacheService } from '../../../backend/src/services/updates/cache.js';
import { TemplateUpdateChecker } from '../../../backend/src/services/updates/update-checker.js';
import { TemplateDownloadService } from '../../../backend/src/services/updates/downloader.js';
import { TemplateUpdateNotifier } from '../../../backend/src/services/updates/notifier.js';

export interface ExpandIdeaParams {
  ideaDescription: string;
  userId?: string; // Optional: defaults to 'anonymous'
  templatesPath?: string; // Optional: defaults to './templates'
  skipUpdateCheck?: boolean; // Optional: skip template update check (for testing)
}

export interface ExpandIdeaResult {
  success: boolean;
  sessionId: string;
  specPath?: string;
  message: string;
}

/**
 * Main handler for /expand_idea command
 */
export async function expandIdea(params: ExpandIdeaParams): Promise<ExpandIdeaResult> {
  const userId = params.userId || 'anonymous';
  const templatesPath = params.templatesPath || join(process.cwd(), 'templates');

  try {
    logger.info('Expand idea command initiated', {
      ideaDescription: params.ideaDescription,
      userId,
    });

    // Check template updates (FR-021, FR-022, FR-023)
    if (!params.skipUpdateCheck) {
      await checkAndUpdateTemplates();
    }

    // Create new session
    const session = createSession({
      userId,
      ideaTitle: params.ideaDescription.substring(0, 200), // Use description as title initially
    });

    // Save session to filesystem (FR-006)
    await saveSession(session);

    // Load validation guidelines (FR-003)
    const guidelineConfig: GuidelineLoaderConfig = { templatesPath };
    const guideline = await loadDefaultGuideline(guidelineConfig);

    // Initialize conversation (FR-004, FR-005)
    let state = initializeConversation(session, guideline);

    console.log('\n🎯 Idea Validation Workflow\n');
    console.log(`Idea: ${params.ideaDescription}\n`);
    console.log('---\n');

    // Interactive validation loop (FR-004, FR-005)
    while (!state.isComplete && state.currentQuestion) {
      // Display question
      const questionDisplay = generateQuestionDisplay(state.currentQuestion);
      console.log(questionDisplay);

      // Get user input (in real implementation, this would be async/interactive)
      // For now, we'll simulate with placeholder responses
      // TODO: Implement actual user input handling

      const userAnswer = await getUserInput();

      // Validate answer
      const validation = validateAnswer(state.currentQuestion, userAnswer);
      if (!validation.valid) {
        console.log(`\n❌ ${validation.error}\n`);
        continue;
      }

      // Process answer and move to next question
      state = processAnswer(state, userAnswer);

      // Save updated session state
      await saveSession(state.session);

      // Show progress
      const summary = getConversationSummary(state);
      console.log(`\n✓ Completed: ${summary.completedQuestions}/${summary.totalQuestions}\n`);
      console.log('---\n');
    }

    // Generate specification (FR-007, FR-008)
    console.log('📝 Generating specification...\n');

    const templateConfig: TemplateRendererConfig = { templatesPath };
    const spec = await renderFromResponses(
      state.session.ideaTitle || params.ideaDescription,
      userId,
      state.session.responses,
      templateConfig
    );

    // Validate specification has all required sections
    const specValidation = validateRenderedSpec(spec);
    if (!specValidation.valid) {
      throw new Error(
        `Generated specification is missing required sections: ${specValidation.missingSections.join(', ')}`
      );
    }

    // Save specification to file
    const specsDir = join(homedir(), '.claude', 'idea-workflow', 'specs');
    await mkdir(specsDir, { recursive: true });

    const specName = params.ideaDescription
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50);
    const specPath = join(specsDir, specName, 'spec.md');

    await mkdir(join(specsDir, specName), { recursive: true });
    await writeFile(specPath, spec, 'utf-8');

    logger.info('Specification generated and saved', {
      sessionId: session.id,
      specPath,
    });

    // Mark session as completed
    state.session.status = 'completed';
    await saveSession(state.session);

    console.log('✅ Specification Generated Successfully\n');
    console.log(`Title: ${state.session.ideaTitle}`);
    console.log(`Location: ${specPath}\n`);
    console.log('Next steps:');
    console.log(`- Review specification: cat ${specPath}`);
    console.log(`- Publish idea: /publish_idea ${specName}`);
    console.log(`- Continue editing: Edit the spec file directly\n`);

    return {
      success: true,
      sessionId: session.id,
      specPath,
      message: 'Specification generated successfully',
    };
  } catch (error) {
    logger.error('Expand idea command failed', error as Error, {
      ideaDescription: params.ideaDescription,
    });

    console.error('\n❌ Validation Failed\n');
    console.error((error as Error).message);
    console.error('\nPlease try again with: /expand_idea <detailed-description>\n');

    return {
      success: false,
      sessionId: '',
      message: `Failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Simulate user input (placeholder for interactive implementation)
 * In production, this would integrate with Claude Code's interactive input
 */
async function getUserInput(): Promise<string> {
  // TODO: Implement actual interactive user input
  // For now, return placeholder response
  return 'Sample response for testing';
}

/**
 * Resume a paused validation session
 */
export async function resumeIdea(sessionId: string): Promise<ExpandIdeaResult> {
  try {
    // Load session from filesystem
    const session = await loadSession(sessionId);

    if (session.status === 'completed') {
      return {
        success: false,
        sessionId,
        message: 'Session already completed',
      };
    }

    if (session.status === 'abandoned') {
      return {
        success: false,
        sessionId,
        message: 'Session was abandoned',
      };
    }

    logger.info('Resuming validation session', { sessionId });

    // Continue from where user left off
    // Implementation would be similar to expandIdea but starting from current question

    return {
      success: true,
      sessionId,
      message: 'Session resumed',
    };
  } catch (error) {
    logger.error('Failed to resume session', error as Error, { sessionId });

    return {
      success: false,
      sessionId,
      message: `Failed to resume: ${(error as Error).message}`,
    };
  }
}

/**
 * Publish a generated idea to the central repository
 * Implements atomic git + database publish (FR-009, FR-010)
 */
export interface PublishIdeaParams {
  specPath: string;
  userId: string;
  userEmail: string;
  userName?: string;
  repoPath?: string; // Defaults to env.IDEAS_REPO_PATH
}

export interface PublishIdeaResult {
  success: boolean;
  ideaId?: string;
  commitSha?: string;
  message: string;
}

export async function publishIdea(params: PublishIdeaParams): Promise<PublishIdeaResult> {
  try {
    const { readFile } = await import('fs/promises');
    const { Pool } = await import('pg');
    const { atomicPublish } = await import('../../../backend/src/services/publishing/transaction-coordinator.js');
    const { extractMetadata } = await import('../../../backend/src/services/publishing/metadata-extractor.js');

    logger.info('Publishing idea', {
      specPath: params.specPath,
      userId: params.userId,
    });

    // Read specification file
    const specContent = await readFile(params.specPath, 'utf-8');

    // Extract title from spec (first # heading)
    const titleMatch = specContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Idea';

    // Extract metadata
    const metadata = extractMetadata(specContent);

    // Create database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Generate idea ID and git path
    const ideaId = crypto.randomUUID();
    const gitPath = `ideas/${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/spec.md`;

    // Create idea object
    const now = new Date();
    const idea = {
      id: ideaId,
      userId: params.userId,
      title,
      status: 'draft' as const,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      gitPath,
      gitCommitSha: null,
    };

    // Get repository path from environment
    const repoPath = params.repoPath || process.env.IDEAS_REPO_PATH || join(homedir(), '.claude', 'idea-workflow', 'repo');

    // Execute atomic publish
    const result = await atomicPublish(
      {
        idea,
        specContent,
        artifacts: [], // No additional artifacts for now
        userName: params.userName || params.userEmail,
        userEmail: params.userEmail,
        repoPath,
      },
      pool
    );

    // Close database connection
    await pool.end();

    if (!result.success) {
      logger.error('Publish failed', {
        ideaId,
        error: result.error,
      });

      console.error('\n❌ Publish Failed\n');
      console.error(result.error);
      if (result.rollbackPerformed) {
        console.error('\n✓ Rollback completed - no partial publish\n');
      }

      return {
        success: false,
        message: result.error || 'Unknown error',
      };
    }

    logger.info('Idea published successfully', {
      ideaId: result.ideaId,
      commitSha: result.commitSha,
    });

    console.log('\n✅ Idea Published Successfully\n');
    console.log(`Idea ID: ${result.ideaId}`);
    console.log(`Git Commit: ${result.commitSha}`);
    console.log(`Git Path: ${gitPath}\n`);
    console.log('Your idea is now available in the central repository!\n');

    return {
      success: true,
      ideaId: result.ideaId || undefined,
      commitSha: result.commitSha || undefined,
      message: 'Idea published successfully',
    };
  } catch (error) {
    logger.error('Publish idea command failed', error as Error, {
      specPath: params.specPath,
    });

    console.error('\n❌ Publish Failed\n');
    console.error((error as Error).message);

    return {
      success: false,
      message: `Failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Check for template updates and download if available
 * Implements FR-021, FR-022, FR-023 (update checks with 24-hour interval)
 * Implements FR-027, FR-028, FR-029 (graceful failure handling)
 */
async function checkAndUpdateTemplates(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const cacheService = new TemplateCacheService(pool);
  const updateChecker = new TemplateUpdateChecker();
  const downloader = new TemplateDownloadService();
  const notifier = new TemplateUpdateNotifier();

  try {
    // Check if update check is due (24-hour interval)
    const status = await cacheService.getCacheStatus();

    if (!status.isCheckDue) {
      // Update check not due yet - skip
      const notification = notifier.createSkippedCheckNotification(
        status.nextCheckDue!,
        status.currentVersionSha!
      );
      logger.debug(notification.message);
      await pool.end();
      return;
    }

    logger.info('Template update check due - checking for updates');

    // Check for updates
    const checkResult = await updateChecker.checkForUpdates(status.currentVersionSha);

    if (!checkResult.hasUpdates) {
      // No updates available - record check and continue
      await cacheService.recordUpdateCheck(checkResult.latestSha, false);

      const notification = notifier.createNoUpdatesNotification(checkResult.latestSha);
      notifier.displayNotification(notification);

      await pool.end();
      return;
    }

    // Updates available - download them
    logger.info('Template updates available - downloading', {
      currentSha: checkResult.currentSha,
      latestSha: checkResult.latestSha,
      updatedFilesCount: checkResult.updatedFiles?.length || 0,
    });

    const downloadResult = await downloader.downloadTemplates(checkResult.latestSha);

    if (!downloadResult.success) {
      // Download failed - continue with existing templates (FR-027, FR-029)
      logger.warn('Template download failed - continuing with existing templates', {
        error: downloadResult.error,
      });

      const notification = notifier.createUpdateFailureNotification(
        downloadResult.error || 'Unknown error',
        status.currentVersionSha || undefined
      );
      notifier.displayNotification(notification);

      // Record check timestamp even though download failed (FR-027a, FR-027b)
      await cacheService.recordUpdateCheck(
        status.currentVersionSha || checkResult.latestSha,
        false
      );

      await pool.end();
      return;
    }

    // Download successful - record update
    await cacheService.recordUpdateCheck(downloadResult.newVersionSha, true);

    const notification = notifier.createUpdateSuccessNotification(
      checkResult.currentSha,
      downloadResult.newVersionSha,
      downloadResult.updatedFiles
    );
    notifier.displayNotification(notification);

    logger.info('Templates updated successfully', {
      previousVersion: checkResult.currentSha,
      newVersion: downloadResult.newVersionSha,
      updatedFilesCount: downloadResult.updatedFiles.length,
    });
  } catch (error) {
    // Critical error in update process - log and continue with existing templates (FR-027, FR-029)
    logger.error('Template update process failed - continuing with existing templates', {
      error,
    });

    const notification = notifier.createUpdateFailureNotification(
      (error as Error).message,
      await cacheService.getCurrentVersionSha() || undefined
    );
    notifier.displayNotification(notification);

    // Don't re-throw - graceful degradation
  } finally {
    await pool.end();
  }
}

// Export default handler
export default expandIdea;
