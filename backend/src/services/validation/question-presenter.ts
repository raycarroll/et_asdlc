// Question Presenter Service
// Based on FR-004: Present validation questions to user

import type { ValidationQuestion } from '../../../../shared/types/template.js';

export interface FormattedQuestion {
  questionNumber: number;
  totalQuestions: number;
  id: string;
  text: string;
  type: 'multiple-choice' | 'short-answer';
  options?: string[];
  maxLength?: number;
  context?: string;
}

export interface FollowupQuestion extends FormattedQuestion {
  isFollowup: true;
  triggerAnswer: string;
}

/**
 * Format a validation question for presentation to user
 */
export function formatQuestion(
  question: ValidationQuestion,
  questionNumber: number,
  totalQuestions: number,
  context?: string
): FormattedQuestion {
  return {
    questionNumber,
    totalQuestions,
    id: question.id,
    text: question.text,
    type: question.type,
    options: question.options,
    maxLength: question.maxLength,
    context,
  };
}

/**
 * Format a follow-up question based on user's previous answer
 */
export function formatFollowupQuestion(
  question: ValidationQuestion,
  triggerAnswer: string,
  questionNumber: number,
  totalQuestions: number
): FollowupQuestion | null {
  if (!question.followup) {
    return null;
  }

  // Check if user's answer matches the followup condition
  if (question.followup.if !== triggerAnswer) {
    return null;
  }

  return {
    isFollowup: true,
    triggerAnswer,
    questionNumber,
    totalQuestions,
    id: `${question.id}-followup`,
    text: question.followup.text,
    type: 'short-answer', // Followups are always short-answer
    context: `Based on your answer: "${triggerAnswer}"`,
  };
}

/**
 * Generate user-friendly display text for a question
 */
export function generateQuestionDisplay(formatted: FormattedQuestion): string {
  let display = `[Validation Question ${formatted.questionNumber}/${formatted.totalQuestions}]\n\n`;

  if (formatted.context) {
    display += `Context: ${formatted.context}\n\n`;
  }

  display += `Question: ${formatted.text}\n\n`;

  if (formatted.type === 'multiple-choice' && formatted.options) {
    display += 'Suggested answers:\n';
    formatted.options.forEach((option, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, D...
      display += `${letter}) ${option}\n`;
    });
    display += '\nYour answer: ';
  } else if (formatted.type === 'short-answer') {
    const maxLengthHint = formatted.maxLength
      ? ` (max ${formatted.maxLength} characters)`
      : '';
    display += `Format: Short answer${maxLengthHint}\n\nYour answer: `;
  }

  return display;
}

/**
 * Validate user's answer format
 */
export function validateAnswer(
  formatted: FormattedQuestion,
  answer: string
): { valid: boolean; error?: string } {
  if (!answer || answer.trim().length === 0) {
    return { valid: false, error: 'Answer cannot be empty' };
  }

  if (formatted.type === 'multiple-choice' && formatted.options) {
    // Check if answer is a valid option letter (A, B, C, etc.)
    const letterMatch = answer.trim().toUpperCase().match(/^([A-Z])$/);
    if (letterMatch) {
      const index = letterMatch[1].charCodeAt(0) - 65;
      if (index < 0 || index >= formatted.options.length) {
        return {
          valid: false,
          error: `Invalid option. Please select A-${String.fromCharCode(65 + formatted.options.length - 1)}`,
        };
      }
      return { valid: true };
    }

    // Allow custom answer if not a letter
    return { valid: true };
  }

  if (formatted.type === 'short-answer' && formatted.maxLength) {
    if (answer.length > formatted.maxLength) {
      return {
        valid: false,
        error: `Answer exceeds maximum length of ${formatted.maxLength} characters`,
      };
    }
  }

  return { valid: true };
}

/**
 * Parse user's answer (convert option letters to actual text)
 */
export function parseAnswer(formatted: FormattedQuestion, answer: string): string {
  const trimmed = answer.trim();

  if (formatted.type === 'multiple-choice' && formatted.options) {
    const letterMatch = trimmed.toUpperCase().match(/^([A-Z])$/);
    if (letterMatch) {
      const index = letterMatch[1].charCodeAt(0) - 65;
      if (index >= 0 && index < formatted.options.length) {
        return formatted.options[index] || trimmed;
      }
    }
  }

  return trimmed;
}

/**
 * Generate progress indicator
 */
export function generateProgressIndicator(
  currentQuestionNumber: number,
  totalQuestions: number,
  completedQuestionIds: string[]
): string {
  const completed = completedQuestionIds.length;
  const remaining = totalQuestions - completed - 1; // -1 for current question

  let progress = '\nProgress:\n';
  progress += `✓ Completed: ${completed}/${totalQuestions}\n`;
  progress += `→ In progress: Question ${currentQuestionNumber}\n`;
  progress += `  Remaining: ${remaining} question${remaining !== 1 ? 's' : ''}\n`;

  return progress;
}
