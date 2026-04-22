// ConversationSession Model
// Based on specs/001-idea-spec-workflow/data-model.md

import type {
  ConversationSession,
  SessionStatus,
  QuestionResponse,
  CreateSessionParams,
  UpdateSessionParams,
  SessionQueryOptions
} from '../../../shared/types/session.js';

export interface SessionRecord {
  id: string;
  user_id: string;
  idea_title: string | null;
  current_question_index: number;
  responses: Record<string, QuestionResponse>;
  partial_spec: string | null;
  status: SessionStatus;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

/**
 * Convert database record to domain model
 */
export function toDomain(record: SessionRecord): ConversationSession {
  return {
    id: record.id,
    userId: record.user_id,
    ideaTitle: record.idea_title,
    currentQuestionIndex: record.current_question_index,
    responses: record.responses,
    partialSpec: record.partial_spec,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    expiresAt: record.expires_at,
  };
}

/**
 * Convert domain model to database record
 */
export function toDatabase(session: ConversationSession): Partial<SessionRecord> {
  return {
    id: session.id,
    user_id: session.userId,
    idea_title: session.ideaTitle,
    current_question_index: session.currentQuestionIndex,
    responses: session.responses,
    partial_spec: session.partialSpec,
    status: session.status,
    expires_at: session.expiresAt,
  };
}

/**
 * Create a new session with default values
 */
export function createSession(params: CreateSessionParams): ConversationSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    id: crypto.randomUUID(),
    userId: params.userId,
    ideaTitle: params.ideaTitle,
    currentQuestionIndex: 0,
    responses: {},
    partialSpec: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };
}

/**
 * Update session with new values
 */
export function updateSession(
  session: ConversationSession,
  updates: UpdateSessionParams
): ConversationSession {
  return {
    ...session,
    currentQuestionIndex: updates.currentQuestionIndex ?? session.currentQuestionIndex,
    responses: updates.responses ?? session.responses,
    partialSpec: updates.partialSpec ?? session.partialSpec,
    status: updates.status ?? session.status,
    updatedAt: new Date(),
  };
}

/**
 * Check if session is expired
 */
export function isExpired(session: ConversationSession): boolean {
  return new Date() > session.expiresAt;
}

/**
 * Check if session is active
 */
export function isActive(session: ConversationSession): boolean {
  return session.status === 'active' && !isExpired(session);
}

/**
 * Mark session as completed
 */
export function completeSession(session: ConversationSession): ConversationSession {
  return {
    ...session,
    status: 'completed',
    updatedAt: new Date(),
  };
}

/**
 * Mark session as abandoned
 */
export function abandonSession(session: ConversationSession): ConversationSession {
  return {
    ...session,
    status: 'abandoned',
    updatedAt: new Date(),
  };
}
