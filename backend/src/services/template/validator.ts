// Template Validation Service
// Syntax validation for YAML/JSON/Markdown templates
// Based on specs/001-idea-spec-workflow/spec.md (FR-015e, FR-015e-1, FR-015e-2)

import { logger } from '../../utils/logger.js';
import type { TemplateType } from '../../models/template.js';
import * as yaml from 'js-yaml';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate template content based on type
 */
export async function validateTemplateContent(
  content: string,
  type: TemplateType
): Promise<ValidationResult> {
  logger.debug('Validating template content', { type });

  const errors: string[] = [];

  // Check content is not empty
  if (!content || content.trim() === '') {
    errors.push('Template content cannot be empty');
    return { valid: false, errors };
  }

  // Validate based on type
  switch (type) {
    case 'spec':
      return validateMarkdownTemplate(content);
    case 'guideline':
      return validateYamlTemplate(content);
    case 'validation':
      return validateYamlTemplate(content);
    default:
      errors.push(`Unknown template type: ${type}`);
      return { valid: false, errors };
  }
}

/**
 * Validate Markdown template syntax
 */
function validateMarkdownTemplate(content: string): ValidationResult {
  const errors: string[] = [];

  // Check for basic Markdown structure
  if (!content.includes('#')) {
    errors.push('Markdown template must contain at least one heading');
  }

  // Check for Handlebars placeholders
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders = content.match(placeholderRegex);

  if (placeholders && placeholders.length > 0) {
    // Validate placeholder syntax
    for (const placeholder of placeholders) {
      const inner = placeholder.slice(2, -2).trim();

      // Check for invalid characters
      if (!/^[a-zA-Z0-9_.-]+$/.test(inner)) {
        errors.push(
          `Invalid placeholder syntax: ${placeholder}. Placeholders must contain only alphanumeric characters, underscores, dots, and hyphens.`
        );
      }
    }
  }

  // Check for balanced Handlebars blocks
  const blockOpenRegex = /\{\{#([a-zA-Z0-9_-]+)/g;
  const blockCloseRegex = /\{\{\/([a-zA-Z0-9_-]+)/g;

  const opens = content.match(blockOpenRegex) || [];
  const closes = content.match(blockCloseRegex) || [];

  if (opens.length !== closes.length) {
    errors.push(
      `Unbalanced Handlebars blocks: ${opens.length} opens, ${closes.length} closes`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate YAML template syntax
 */
function validateYamlTemplate(content: string): ValidationResult {
  const errors: string[] = [];

  try {
    // Parse YAML to check syntax
    yaml.load(content);

    // Basic YAML structure checks
    if (!content.includes(':')) {
      errors.push('YAML template must contain key-value pairs');
    }

    // Check indentation consistency (spaces only, no tabs)
    if (content.includes('\t')) {
      errors.push('YAML must use spaces for indentation, not tabs');
    }

    // Check for common YAML issues
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines and comments
      if (line.trim() === '' || line.trim().startsWith('#')) {
        continue;
      }

      // Check for inconsistent indentation (must be multiples of 2)
      const leadingSpaces = line.match(/^ */)?.[0].length || 0;
      if (leadingSpaces % 2 !== 0) {
        errors.push(
          `Line ${i + 1}: Inconsistent indentation (must be multiples of 2 spaces)`
        );
      }
    }
  } catch (error) {
    errors.push(
      `YAML validation error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate JSON template syntax
 */
function validateJsonTemplate(content: string): ValidationResult {
  const errors: string[] = [];

  try {
    JSON.parse(content);
  } catch (error) {
    errors.push(
      `JSON syntax error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if template content has changed
 */
export function hasContentChanged(
  oldContent: string,
  newContent: string
): boolean {
  // Normalize line endings and trim whitespace
  const normalizeContent = (content: string): string => {
    return content.replace(/\r\n/g, '\n').trim();
  };

  return normalizeContent(oldContent) !== normalizeContent(newContent);
}

/**
 * Sanitize template content for safe storage
 */
export function sanitizeTemplateContent(content: string): string {
  // Normalize line endings to Unix format
  let sanitized = content.replace(/\r\n/g, '\n');

  // Remove trailing whitespace from each line
  sanitized = sanitized
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // Ensure file ends with newline
  if (!sanitized.endsWith('\n')) {
    sanitized += '\n';
  }

  return sanitized;
}
