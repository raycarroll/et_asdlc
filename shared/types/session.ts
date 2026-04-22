// Shared type definitions for ConversationSession
// Based on specs/001-idea-spec-workflow/data-model.md

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface ConversationSession {
  id: string; // UUID
  userId: string; // UUID
  ideaTitle: string | null;
  currentQuestionIndex: number; // >= 0
  responses: Record<string, QuestionResponse>;
  partialSpec: string | null;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // Auto-cleanup threshold
}

export interface QuestionResponse {
  question: string;
  answer: string;
}

// Session state file format (for local filesystem storage)
export interface SessionStateFile {
  sessionId: string;
  userId: string;
  ideaTitle: string;
  currentQuestionIndex: number;
  responses: Record<string, QuestionResponse>;
  partialSpec: string;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
}

// Session creation/update operations
export interface CreateSessionParams {
  userId: string;
  ideaTitle: string;
}

export interface UpdateSessionParams {
  currentQuestionIndex?: number;
  responses?: Record<string, QuestionResponse>;
  partialSpec?: string;
  status?: SessionStatus;
}

// Session query options
export interface SessionQueryOptions {
  userId?: string;
  status?: SessionStatus;
  includeExpired?: boolean;
}
