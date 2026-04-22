// Template Semantic Validation Service
// Check placeholders and structure requirements
// Based on specs/001-idea-spec-workflow/spec.md (FR-015e, FR-015e-1, FR-015e-2)

import { logger } from '../../utils/logger.js';
import type { TemplateType } from '../../models/template.js';

export interface SemanticValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate template semantic requirements
 */
export async function validateTemplateSemantics(
  content: string,
  type: TemplateType
): Promise<SemanticValidationResult> {
  logger.debug('Validating template semantics', { type });

  switch (type) {
    case 'spec':
      return validateSpecTemplateSemantics(content);
    case 'guideline':
      return validateGuidelineTemplateSemantics(content);
    case 'validation':
      return validateValidationTemplateSemantics(content);
    default:
      return {
        valid: false,
        errors: [`Unknown template type: ${type}`],
        warnings: [],
      };
  }
}

/**
 * Validate spec template semantic requirements
 */
function validateSpecTemplateSemantics(
  content: string
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required placeholders for spec templates
  const requiredPlaceholders = [
    'title',
    'author',
    'createdDate',
  ];

  // Extract all placeholders from content
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders = new Set<string>();

  let match;
  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1].trim();
    placeholders.add(placeholder);
  }

  // Check for required placeholders
  for (const required of requiredPlaceholders) {
    if (!placeholders.has(required)) {
      errors.push(
        `Missing required placeholder: {{${required}}}`
      );
    }
  }

  // Check for required sections
  const requiredSections = [
    '# ',
    '## Overview',
    '## Requirements',
    '## Success Criteria',
  ];

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Check for proper heading hierarchy
  const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
  if (headings.length === 0) {
    errors.push('Template must contain at least one heading');
  }

  // Warn about unused common placeholders
  const commonPlaceholders = [
    'summary',
    'goals',
    'assumptions',
    'constraints',
  ];

  for (const common of commonPlaceholders) {
    if (!placeholders.has(common)) {
      warnings.push(
        `Consider adding placeholder: {{${common}}}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate guideline template semantic requirements
 */
function validateGuidelineTemplateSemantics(
  content: string
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required YAML fields
  const requiredFields = [
    'questions:',
    'question:',
    'type:',
  ];

  for (const field of requiredFields) {
    if (!content.includes(field)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check for valid question types
  const questionTypes = [
    'text',
    'multiple_choice',
    'yes_no',
    'number',
    'date',
  ];

  const typeMatches = content.match(/type:\s*(\w+)/g) || [];
  for (const typeMatch of typeMatches) {
    const type = typeMatch.split(':')[1].trim();
    if (!questionTypes.includes(type)) {
      errors.push(
        `Invalid question type: ${type}. Must be one of: ${questionTypes.join(', ')}`
      );
    }
  }

  // Check for question IDs
  if (!content.includes('id:')) {
    warnings.push('Consider adding unique IDs to questions for tracking');
  }

  // Check for validation rules
  if (!content.includes('required:') && !content.includes('validation:')) {
    warnings.push('Consider adding validation rules for questions');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate validation template semantic requirements
 */
function validateValidationTemplateSemantics(
  content: string
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required validation fields
  const requiredFields = [
    'rules:',
    'rule:',
    'pattern:',
  ];

  for (const field of requiredFields) {
    if (!content.includes(field)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check for validation patterns
  if (!content.includes('regex:') && !content.includes('min:') && !content.includes('max:')) {
    warnings.push('Consider adding validation patterns (regex, min, max)');
  }

  // Check for error messages
  if (!content.includes('error:') && !content.includes('message:')) {
    warnings.push('Consider adding error messages for validation failures');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract all placeholders from template content
 */
export function extractPlaceholders(content: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];

  let match;
  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1].trim();
    placeholders.push(placeholder);
  }

  return Array.from(new Set(placeholders));
}

/**
 * Check if a placeholder exists in template
 */
export function hasPlaceholder(
  content: string,
  placeholder: string
): boolean {
  const regex = new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g');
  return regex.test(content);
}

/**
 * Validate that all data fields have corresponding placeholders
 */
export function validateDataMapping(
  content: string,
  requiredFields: string[]
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const placeholders = extractPlaceholders(content);

  for (const field of requiredFields) {
    if (!placeholders.includes(field)) {
      errors.push(
        `Missing placeholder for required field: {{${field}}}`
      );
    }
  }

  // Check for unused placeholders
  const unusedPlaceholders = placeholders.filter(
    (p) => !requiredFields.includes(p)
  );

  if (unusedPlaceholders.length > 0) {
    warnings.push(
      `Placeholders without corresponding data fields: ${unusedPlaceholders.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
