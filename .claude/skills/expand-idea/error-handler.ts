// Error Handling and Retry Logic
// Based on FR-017: Provide clear error messages and retry options

import { logger } from '../../../backend/src/utils/logger.js';

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number; // Default: 2 (exponential backoff)
}

export interface ErrorContext {
  operation: string;
  ideaDescription?: string;
  sessionId?: string;
  step?: string;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  context: ErrorContext
): Promise<T> {
  const backoffMultiplier = config.backoffMultiplier || 2;
  let lastError: Error | null = null;
  let delay = config.delayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      logger.debug('Attempting operation', { ...context, attempt, maxAttempts: config.maxAttempts });
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxAttempts) {
        logger.warn('Operation failed, retrying...', {
          ...context,
          attempt,
          error: (error as Error).message,
          nextRetryDelayMs: delay,
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff
        delay *= backoffMultiplier;
      } else {
        logger.error('Operation failed after all retries', error as Error, {
          ...context,
          attempts: config.maxAttempts,
        });
      }
    }
  }

  throw lastError;
}

/**
 * Create user-friendly error messages based on error type
 */
export function formatUserError(error: Error, context: ErrorContext): string {
  const errorMessage = error.message.toLowerCase();

  // Template loading errors
  if (errorMessage.includes('failed to load guideline') || errorMessage.includes('failed to load template')) {
    return `❌ Template Loading Error\n\n` +
           `Could not load validation templates. This might be because:\n` +
           `- Templates are not yet downloaded from the central repository\n` +
           `- Network connection is unavailable\n` +
           `- Template files are corrupted\n\n` +
           `The system will retry fetching templates in the background.\n` +
           `For now, please ensure you have network connectivity and try again.\n\n` +
           `Error details: ${error.message}`;
  }

  // Session errors
  if (errorMessage.includes('session not found')) {
    return `❌ Session Not Found\n\n` +
           `The validation session "${context.sessionId}" could not be found.\n` +
           `This might be because:\n` +
           `- The session has expired (sessions last 7 days)\n` +
           `- The session ID is incorrect\n` +
           `- Session files were manually deleted\n\n` +
           `To start a new validation session, use:\n` +
           `/expand_idea <your-idea-description>`;
  }

  // Filesystem errors
  if (errorMessage.includes('enoent') || errorMessage.includes('eacces')) {
    return `❌ File System Error\n\n` +
           `Could not access required files or directories.\n` +
           `Please check that you have write permissions for:\n` +
           `- ~/.claude/idea-workflow/sessions/ (for saving session state)\n` +
           `- ~/.claude/idea-workflow/specs/ (for saving generated specs)\n\n` +
           `Error details: ${error.message}`;
  }

  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return `❌ Validation Error\n\n` +
           `The idea description or validation responses were invalid.\n` +
           `Please provide:\n` +
           `- A clear description of what you want to build\n` +
           `- Complete answers to validation questions\n` +
           `- Specific details about the feature or problem\n\n` +
           `Error details: ${error.message}`;
  }

  // Specification generation errors
  if (errorMessage.includes('specification') || errorMessage.includes('missing required sections')) {
    return `❌ Specification Generation Error\n\n` +
           `Could not generate a complete specification.\n` +
           `This might be because:\n` +
           `- Some validation questions were not answered completely\n` +
           `- The template is missing required sections\n` +
           `- Template rendering failed\n\n` +
           `Please try again with more detailed responses.\n\n` +
           `Error details: ${error.message}`;
  }

  // Generic error fallback
  return `❌ Unexpected Error\n\n` +
         `An unexpected error occurred during ${context.operation}.\n\n` +
         `Error details: ${error.message}\n\n` +
         `If this persists, please check:\n` +
         `- Network connectivity\n` +
         `- File system permissions\n` +
         `- Template repository accessibility\n\n` +
         `You can retry the operation or start a new session.`;
}

/**
 * Suggest next steps based on error type and context
 */
export function suggestNextSteps(error: Error, context: ErrorContext): string[] {
  const errorMessage = error.message.toLowerCase();
  const suggestions: string[] = [];

  if (errorMessage.includes('template') || errorMessage.includes('guideline')) {
    suggestions.push('Check network connectivity');
    suggestions.push('Wait a few minutes and try again (templates may be downloading)');
    suggestions.push('Contact administrator if templates are not available');
  }

  if (errorMessage.includes('session')) {
    suggestions.push('Start a new validation session with /expand_idea');
    suggestions.push('List active sessions with /list_idea_sessions');
  }

  if (errorMessage.includes('permission') || errorMessage.includes('eacces')) {
    suggestions.push('Check file system permissions for ~/.claude/idea-workflow/');
    suggestions.push('Ensure you have write access to your home directory');
  }

  if (errorMessage.includes('specification') || errorMessage.includes('validation')) {
    suggestions.push('Provide more detailed answers to validation questions');
    suggestions.push('Review the generated spec and fill in missing sections manually');
    suggestions.push('Try again with a clearer idea description');
  }

  // Always offer retry option
  if (context.sessionId) {
    suggestions.push(`Resume this session with /resume_idea ${context.sessionId}`);
  } else {
    suggestions.push('Retry the operation');
  }

  return suggestions;
}

/**
 * Log error with full context for debugging
 */
export function logErrorWithContext(error: Error, context: ErrorContext): void {
  logger.error(`Error during ${context.operation}`, error, {
    operation: context.operation,
    ideaDescription: context.ideaDescription,
    sessionId: context.sessionId,
    step: context.step,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  });
}

/**
 * Handle error and return user-friendly message with suggestions
 */
export function handleError(error: Error, context: ErrorContext): {
  message: string;
  suggestions: string[];
} {
  logErrorWithContext(error, context);

  return {
    message: formatUserError(error, context),
    suggestions: suggestNextSteps(error, context),
  };
}
