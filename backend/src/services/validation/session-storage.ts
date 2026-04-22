// Session Persistence Service
// Based on FR-006: Save/load session state files in ~/.claude/idea-workflow/sessions/

import { mkdir, writeFile, readFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type {
  ConversationSession,
  SessionStateFile,
} from '../../../../shared/types/session.js';
import { logger } from '../../utils/logger.js';

export interface SessionStorageConfig {
  basePath?: string; // Default: ~/.claude/idea-workflow/sessions/
}

/**
 * Get the sessions directory path
 */
function getSessionsPath(config?: SessionStorageConfig): string {
  if (config?.basePath) {
    return config.basePath;
  }
  return join(homedir(), '.claude', 'idea-workflow', 'sessions');
}

/**
 * Get the file path for a specific session
 */
function getSessionFilePath(sessionId: string, config?: SessionStorageConfig): string {
  return join(getSessionsPath(config), `${sessionId}.json`);
}

/**
 * Ensure sessions directory exists
 */
async function ensureSessionsDirectory(config?: SessionStorageConfig): Promise<void> {
  const path = getSessionsPath(config);
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Convert domain session to file format
 */
function toFileFormat(session: ConversationSession): SessionStateFile {
  return {
    sessionId: session.id,
    userId: session.userId,
    ideaTitle: session.ideaTitle || '',
    currentQuestionIndex: session.currentQuestionIndex,
    responses: session.responses,
    partialSpec: session.partialSpec || '',
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

/**
 * Convert file format to domain session
 */
function fromFileFormat(file: SessionStateFile): ConversationSession {
  return {
    id: file.sessionId,
    userId: file.userId,
    ideaTitle: file.ideaTitle || null,
    currentQuestionIndex: file.currentQuestionIndex,
    responses: file.responses,
    partialSpec: file.partialSpec || null,
    status: file.status,
    createdAt: new Date(file.createdAt),
    updatedAt: new Date(file.updatedAt),
    expiresAt: new Date(file.expiresAt),
  };
}

/**
 * Save session to filesystem
 */
export async function saveSession(
  session: ConversationSession,
  config?: SessionStorageConfig
): Promise<void> {
  try {
    await ensureSessionsDirectory(config);

    const filePath = getSessionFilePath(session.id, config);
    const fileData = toFileFormat(session);
    const content = JSON.stringify(fileData, null, 2);

    await writeFile(filePath, content, 'utf-8');

    logger.debug('Session saved to filesystem', {
      sessionId: session.id,
      filePath,
    });
  } catch (error) {
    logger.error('Failed to save session', error as Error, {
      sessionId: session.id,
    });
    throw new Error(`Failed to save session: ${(error as Error).message}`);
  }
}

/**
 * Load session from filesystem
 */
export async function loadSession(
  sessionId: string,
  config?: SessionStorageConfig
): Promise<ConversationSession> {
  try {
    const filePath = getSessionFilePath(sessionId, config);
    const content = await readFile(filePath, 'utf-8');
    const fileData = JSON.parse(content) as SessionStateFile;

    const session = fromFileFormat(fileData);

    logger.debug('Session loaded from filesystem', {
      sessionId,
      filePath,
    });

    return session;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Session not found: ${sessionId}`);
    }
    logger.error('Failed to load session', error as Error, { sessionId });
    throw new Error(`Failed to load session: ${(error as Error).message}`);
  }
}

/**
 * Delete session from filesystem
 */
export async function deleteSession(
  sessionId: string,
  config?: SessionStorageConfig
): Promise<void> {
  try {
    const filePath = getSessionFilePath(sessionId, config);
    await unlink(filePath);

    logger.debug('Session deleted from filesystem', {
      sessionId,
      filePath,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Session file doesn't exist, which is fine
      return;
    }
    logger.error('Failed to delete session', error as Error, { sessionId });
    throw new Error(`Failed to delete session: ${(error as Error).message}`);
  }
}

/**
 * Check if session exists on filesystem
 */
export async function sessionExists(
  sessionId: string,
  config?: SessionStorageConfig
): Promise<boolean> {
  try {
    await loadSession(sessionId, config);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * List all session IDs for a user
 */
export async function listUserSessions(
  userId: string,
  config?: SessionStorageConfig
): Promise<string[]> {
  try {
    await ensureSessionsDirectory(config);

    const sessionsPath = getSessionsPath(config);
    const files = await readdir(sessionsPath);

    const sessionIds: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionId = file.replace('.json', '');
      try {
        const session = await loadSession(sessionId, config);
        if (session.userId === userId) {
          sessionIds.push(sessionId);
        }
      } catch (error) {
        // Skip invalid session files
        logger.warn('Skipping invalid session file', { file });
      }
    }

    return sessionIds;
  } catch (error) {
    logger.error('Failed to list user sessions', error as Error, { userId });
    return [];
  }
}

/**
 * Find expired sessions
 */
export async function findExpiredSessions(
  config?: SessionStorageConfig
): Promise<string[]> {
  try {
    await ensureSessionsDirectory(config);

    const sessionsPath = getSessionsPath(config);
    const files = await readdir(sessionsPath);

    const expiredSessionIds: string[] = [];
    const now = new Date();

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionId = file.replace('.json', '');
      try {
        const session = await loadSession(sessionId, config);
        if (session.expiresAt < now) {
          expiredSessionIds.push(sessionId);
        }
      } catch (error) {
        // Skip invalid session files
        logger.warn('Skipping invalid session file during cleanup', { file });
      }
    }

    return expiredSessionIds;
  } catch (error) {
    logger.error('Failed to find expired sessions', error as Error);
    return [];
  }
}

/**
 * Cleanup expired sessions (FR-016)
 */
export async function cleanupExpiredSessions(
  config?: SessionStorageConfig
): Promise<number> {
  try {
    const expiredSessionIds = await findExpiredSessions(config);

    for (const sessionId of expiredSessionIds) {
      await deleteSession(sessionId, config);
    }

    if (expiredSessionIds.length > 0) {
      logger.info('Expired sessions cleaned up', {
        count: expiredSessionIds.length,
        sessionIds: expiredSessionIds,
      });
    }

    return expiredSessionIds.length;
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', error as Error);
    return 0;
  }
}
