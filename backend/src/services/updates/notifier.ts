// Template Update Notification Service
// Displays update messages to users when templates are updated
// Based on specs/001-idea-spec-workflow/spec.md (FR-026, FR-028)

import { logger } from '../../utils/logger.js';

export interface UpdateNotification {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  details?: {
    previousVersion?: string;
    newVersion: string;
    updatedFiles?: string[];
    updateCount?: number;
  };
}

/**
 * Template Update Notification Service
 * Generates and formats update notifications for users
 */
export class TemplateUpdateNotifier {
  /**
   * Create notification for successful template update
   *
   * @param previousVersion - Previous git SHA (if available)
   * @param newVersion - New git SHA after update
   * @param updatedFiles - List of files that were updated
   * @returns Formatted notification
   */
  createUpdateSuccessNotification(
    previousVersion: string | null,
    newVersion: string,
    updatedFiles?: string[]
  ): UpdateNotification {
    const updateCount = updatedFiles?.length || 0;
    const filesList =
      updateCount > 0 && updateCount <= 5
        ? updatedFiles!.map((f) => `  - ${f}`).join('\n')
        : '';

    let message: string;

    if (previousVersion) {
      message = `Templates updated successfully from ${previousVersion.substring(0, 7)} to ${newVersion.substring(0, 7)}`;
    } else {
      message = `Templates initialized to version ${newVersion.substring(0, 7)}`;
    }

    if (updateCount > 0) {
      message += ` (${updateCount} file${updateCount > 1 ? 's' : ''} updated)`;

      if (filesList) {
        message += `:\n${filesList}`;
      }
    }

    logger.info('Template update notification created', {
      previousVersion,
      newVersion,
      updateCount,
    });

    return {
      message,
      level: 'success',
      details: {
        previousVersion: previousVersion || undefined,
        newVersion,
        updatedFiles,
        updateCount,
      },
    };
  }

  /**
   * Create notification for update check (no updates available)
   *
   * @param currentVersion - Current git SHA
   * @returns Formatted notification
   */
  createNoUpdatesNotification(currentVersion: string): UpdateNotification {
    const message = `Templates are up to date (version ${currentVersion.substring(0, 7)})`;

    logger.debug('No updates notification created', { currentVersion });

    return {
      message,
      level: 'info',
      details: {
        newVersion: currentVersion,
      },
    };
  }

  /**
   * Create notification for update failure
   *
   * @param error - Error message
   * @param currentVersion - Current git SHA (if available)
   * @returns Formatted notification
   */
  createUpdateFailureNotification(
    error: string,
    currentVersion?: string
  ): UpdateNotification {
    let message = 'Failed to update templates';

    if (currentVersion) {
      message += `. Continuing with existing version ${currentVersion.substring(0, 7)}`;
    }

    message += `. Error: ${error}`;

    logger.warn('Update failure notification created', {
      error,
      currentVersion,
    });

    return {
      message,
      level: 'warning',
      details: {
        newVersion: currentVersion || 'unknown',
      },
    };
  }

  /**
   * Create notification for skipped update check (not due yet)
   *
   * @param nextCheckDue - When next check is scheduled
   * @param currentVersion - Current git SHA
   * @returns Formatted notification
   */
  createSkippedCheckNotification(
    nextCheckDue: Date,
    currentVersion: string
  ): UpdateNotification {
    const hoursUntilNextCheck = Math.ceil(
      (nextCheckDue.getTime() - Date.now()) / (1000 * 60 * 60)
    );

    const message = `Template update check skipped (next check in ~${hoursUntilNextCheck}h). Current version: ${currentVersion.substring(0, 7)}`;

    logger.debug('Skipped check notification created', {
      nextCheckDue,
      hoursUntilNextCheck,
      currentVersion,
    });

    return {
      message,
      level: 'info',
      details: {
        newVersion: currentVersion,
      },
    };
  }

  /**
   * Display notification to user
   * In CLI context, this logs to console
   * In API context, this would be included in response
   *
   * @param notification - Notification to display
   */
  displayNotification(notification: UpdateNotification): void {
    const prefix = this.getLevelPrefix(notification.level);
    const formattedMessage = `${prefix} ${notification.message}`;

    // Log at appropriate level
    switch (notification.level) {
      case 'error':
        logger.error(formattedMessage, notification.details);
        console.error(formattedMessage);
        break;
      case 'warning':
        logger.warn(formattedMessage, notification.details);
        console.warn(formattedMessage);
        break;
      case 'success':
      case 'info':
      default:
        logger.info(formattedMessage, notification.details);
        console.log(formattedMessage);
        break;
    }
  }

  /**
   * Get emoji/text prefix for notification level
   */
  private getLevelPrefix(level: UpdateNotification['level']): string {
    switch (level) {
      case 'success':
        return '✓';
      case 'info':
        return 'ℹ';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return '';
    }
  }

  /**
   * Format file list for display
   * Shows first N files, then "and X more" if there are many
   */
  private formatFileList(files: string[], maxDisplay: number = 5): string {
    if (files.length === 0) {
      return 'No files updated';
    }

    const displayFiles = files.slice(0, maxDisplay);
    const remaining = files.length - maxDisplay;

    let result = displayFiles.map((f) => `  - ${f}`).join('\n');

    if (remaining > 0) {
      result += `\n  ... and ${remaining} more file${remaining > 1 ? 's' : ''}`;
    }

    return result;
  }

  /**
   * Create notification with formatted file list
   *
   * @param previousVersion - Previous git SHA
   * @param newVersion - New git SHA
   * @param updatedFiles - List of updated files
   * @param maxFilesToShow - Maximum files to show before truncating
   * @returns Formatted notification with file list
   */
  createDetailedUpdateNotification(
    previousVersion: string | null,
    newVersion: string,
    updatedFiles: string[],
    maxFilesToShow: number = 10
  ): UpdateNotification {
    const updateCount = updatedFiles.length;

    let message = previousVersion
      ? `Templates updated from ${previousVersion.substring(0, 7)} to ${newVersion.substring(0, 7)}`
      : `Templates initialized to version ${newVersion.substring(0, 7)}`;

    message += `\n\nUpdated files (${updateCount}):\n${this.formatFileList(updatedFiles, maxFilesToShow)}`;

    return {
      message,
      level: 'success',
      details: {
        previousVersion: previousVersion || undefined,
        newVersion,
        updatedFiles,
        updateCount,
      },
    };
  }
}
