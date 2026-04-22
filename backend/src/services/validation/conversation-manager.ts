// Conversation Manager Service
// Based on FR-005 and FR-006: Track state and handle follow-ups, enable pause/resume

import type {
  ConversationSession,
  QuestionResponse,
} from '../../../../shared/types/session.js';
import type { ValidationGuideline, ValidationQuestion } from '../../../../shared/types/template.js';
import {
  formatQuestion,
  formatFollowupQuestion,
  parseAnswer,
  type FormattedQuestion,
  type FollowupQuestion,
} from './question-presenter.js';
import { updateSession } from '../../models/session.js';
import { logger } from '../../utils/logger.js';

export interface ConversationState {
  session: ConversationSession;
  guideline: ValidationGuideline;
  currentQuestion: FormattedQuestion | FollowupQuestion | null;
  isComplete: boolean;
}

/**
 * Initialize a new conversation
 */
export function initializeConversation(
  session: ConversationSession,
  guideline: ValidationGuideline
): ConversationState {
  const firstQuestion = guideline.questions[0];
  if (!firstQuestion) {
    throw new Error('Guideline has no questions');
  }

  const formattedQuestion = formatQuestion(firstQuestion, 1, guideline.questions.length);

  return {
    session,
    guideline,
    currentQuestion: formattedQuestion,
    isComplete: false,
  };
}

/**
 * Process user's answer and advance to next question
 */
export function processAnswer(
  state: ConversationState,
  answer: string
): ConversationState {
  if (!state.currentQuestion) {
    throw new Error('No current question to process');
  }

  if (state.isComplete) {
    throw new Error('Conversation is already complete');
  }

  // Parse the answer (convert option letters to text if needed)
  const parsedAnswer = parseAnswer(state.currentQuestion, answer);

  // Save the answer
  const responses = {
    ...state.session.responses,
    [state.currentQuestion.id]: {
      question: state.currentQuestion.text,
      answer: parsedAnswer,
    },
  };

  logger.debug('Answer recorded', {
    questionId: state.currentQuestion.id,
    answer: parsedAnswer,
  });

  // Check if this answer triggers a follow-up question
  const currentGuidelineQuestion = state.guideline.questions[state.session.currentQuestionIndex];
  const followup = currentGuidelineQuestion
    ? formatFollowupQuestion(
        currentGuidelineQuestion,
        parsedAnswer,
        state.currentQuestion.questionNumber + 1,
        state.guideline.questions.length
      )
    : null;

  let nextQuestion: FormattedQuestion | FollowupQuestion | null = null;
  let nextQuestionIndex = state.session.currentQuestionIndex;

  if (followup) {
    // Present follow-up question
    nextQuestion = followup;
    // Don't advance question index for follow-ups
  } else {
    // Move to next guideline question
    nextQuestionIndex = state.session.currentQuestionIndex + 1;

    if (nextQuestionIndex < state.guideline.questions.length) {
      const nextGuidelineQuestion = state.guideline.questions[nextQuestionIndex];
      if (nextGuidelineQuestion) {
        nextQuestion = formatQuestion(
          nextGuidelineQuestion,
          nextQuestionIndex + 1,
          state.guideline.questions.length
        );
      }
    }
  }

  // Update session
  const updatedSession = updateSession(state.session, {
    currentQuestionIndex: nextQuestionIndex,
    responses,
  });

  return {
    session: updatedSession,
    guideline: state.guideline,
    currentQuestion: nextQuestion,
    isComplete: nextQuestion === null,
  };
}

/**
 * Resume a paused conversation
 */
export function resumeConversation(
  session: ConversationSession,
  guideline: ValidationGuideline
): ConversationState {
  const currentIndex = session.currentQuestionIndex;

  // Check if conversation was already completed
  if (session.status === 'completed') {
    return {
      session,
      guideline,
      currentQuestion: null,
      isComplete: true,
    };
  }

  // Check if we're past the last question
  if (currentIndex >= guideline.questions.length) {
    return {
      session,
      guideline,
      currentQuestion: null,
      isComplete: true,
    };
  }

  // Load the current question
  const currentGuidelineQuestion = guideline.questions[currentIndex];
  if (!currentGuidelineQuestion) {
    throw new Error(`Question at index ${currentIndex} not found in guideline`);
  }

  const currentQuestion = formatQuestion(
    currentGuidelineQuestion,
    currentIndex + 1,
    guideline.questions.length
  );

  logger.info('Conversation resumed', {
    sessionId: session.id,
    currentQuestionIndex: currentIndex,
    completedQuestions: Object.keys(session.responses).length,
  });

  return {
    session,
    guideline,
    currentQuestion,
    isComplete: false,
  };
}

/**
 * Get all collected responses
 */
export function getCollectedResponses(
  state: ConversationState
): Record<string, QuestionResponse> {
  return state.session.responses;
}

/**
 * Check if answer is incomplete or unclear
 */
export function isAnswerIncomplete(answer: string): boolean {
  const trimmed = answer.trim().toLowerCase();

  // Check for very short answers that are likely incomplete
  if (trimmed.length < 3) {
    return true;
  }

  // Check for placeholder-like answers
  const placeholders = ['tbd', 'todo', 'n/a', 'none', 'idk', 'not sure', '?'];
  if (placeholders.includes(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Generate a follow-up clarification question
 */
export function generateClarificationQuestion(
  originalQuestion: FormattedQuestion,
  originalAnswer: string
): string {
  return `Your answer "${originalAnswer}" seems incomplete. Could you provide more details about: ${originalQuestion.text}`;
}

/**
 * Calculate completion percentage
 */
export function getCompletionPercentage(state: ConversationState): number {
  const totalQuestions = state.guideline.questions.length;
  const completedQuestions = Object.keys(state.session.responses).length;

  return Math.round((completedQuestions / totalQuestions) * 100);
}

/**
 * Get conversation summary
 */
export function getConversationSummary(state: ConversationState): {
  totalQuestions: number;
  completedQuestions: number;
  currentQuestionNumber: number | null;
  completionPercentage: number;
  isComplete: boolean;
} {
  return {
    totalQuestions: state.guideline.questions.length,
    completedQuestions: Object.keys(state.session.responses).length,
    currentQuestionNumber: state.currentQuestion?.questionNumber ?? null,
    completionPercentage: getCompletionPercentage(state),
    isComplete: state.isComplete,
  };
}
