export type SessionStatus = 'active' | 'completed' | 'abandoned';
export interface ConversationSession {
    id: string;
    userId: string;
    ideaTitle: string | null;
    currentQuestionIndex: number;
    responses: Record<string, QuestionResponse>;
    partialSpec: string | null;
    status: SessionStatus;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
}
export interface QuestionResponse {
    question: string;
    answer: string;
}
export interface SessionStateFile {
    sessionId: string;
    userId: string;
    ideaTitle: string;
    currentQuestionIndex: number;
    responses: Record<string, QuestionResponse>;
    partialSpec: string;
    status: 'active' | 'completed' | 'abandoned';
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
}
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
export interface SessionQueryOptions {
    userId?: string;
    status?: SessionStatus;
    includeExpired?: boolean;
}
//# sourceMappingURL=session.d.ts.map