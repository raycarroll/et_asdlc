// Template Rendering Service
// Based on FR-007 and FR-008: Generate specification using template with gathered information

import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import type { SpecTemplateData } from '../../../../shared/types/template.js';
import type { QuestionResponse } from '../../../../shared/types/session.js';
import { logger } from '../../utils/logger.js';

export interface TemplateRendererConfig {
  templatesPath: string;
}

/**
 * Load spec template from file
 */
async function loadTemplate(
  name: string,
  config: TemplateRendererConfig
): Promise<string> {
  try {
    const filePath = join(config.templatesPath, 'spec-templates', `${name}.md`);
    logger.debug('Loading spec template', { name, filePath });

    const content = await readFile(filePath, 'utf-8');

    logger.info('Spec template loaded successfully', { name });

    return content;
  } catch (error) {
    logger.error('Failed to load spec template', error as Error, { name });
    throw new Error(`Failed to load template "${name}": ${(error as Error).message}`);
  }
}

/**
 * Extract template data from validation responses
 */
export function extractTemplateData(
  ideaTitle: string,
  author: string,
  responses: Record<string, QuestionResponse>
): SpecTemplateData {
  // Extract specific responses based on question IDs
  const userGoal = responses['user-goal']?.answer || '';
  const mainGoal = responses['main-goal']?.answer || '';
  const successCriteria = responses['success-criteria']?.answer || '';
  const userScenario = responses['user-scenarios']?.answer || '';
  const edgeCases = responses['edge-cases']?.answer || '';
  const constraints = responses['constraints']?.answer || '';
  const outOfScope = responses['out-of-scope']?.answer || '';
  const dataEntities = responses['data-entities']?.answer || '';
  const acceptanceTest = responses['acceptance-test']?.answer || '';
  const priorityJustification = responses['priority-justification']?.answer || '';

  // Build template data
  const data: SpecTemplateData = {
    title: ideaTitle,
    author,
    createdAt: new Date().toISOString().split('T')[0] || '', // YYYY-MM-DD
    branchName: generateBranchName(ideaTitle),
    summary: mainGoal,
    userScenario,
    acceptanceCriteria: [acceptanceTest],
    edgeCases,
    requirements: generateRequirements(mainGoal, userScenario, constraints),
    entities: dataEntities ? dataEntities.split(',').map((e) => e.trim()) : [],
    successCriteria,
    testingApproach: acceptanceTest,
    technicalConstraints: constraints || undefined,
    outOfScope: outOfScope || undefined,
    priorityJustification,
    userGoal, // Additional context
  };

  return data;
}

/**
 * Generate branch name from idea title
 */
function generateBranchName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate functional requirements from responses
 */
function generateRequirements(
  mainGoal: string,
  userScenario: string,
  constraints: string
): Array<{ id: string; description: string }> {
  const requirements: Array<{ id: string; description: string }> = [];

  // Generate requirements from main goal
  if (mainGoal) {
    requirements.push({
      id: 'FR-001',
      description: `System MUST ${mainGoal}`,
    });
  }

  // Generate requirements from user scenario
  if (userScenario) {
    requirements.push({
      id: 'FR-002',
      description: `System MUST support the following user scenario: ${userScenario}`,
    });
  }

  // Generate requirements from constraints
  if (constraints) {
    requirements.push({
      id: 'NFR-001',
      description: `System MUST adhere to the following constraints: ${constraints}`,
    });
  }

  return requirements;
}

/**
 * Render specification from template
 */
export async function renderSpecification(
  templateName: string,
  templateData: SpecTemplateData,
  config: TemplateRendererConfig
): Promise<string> {
  try {
    // Load template
    const templateContent = await loadTemplate(templateName, config);

    // Compile template
    const template = Handlebars.compile(templateContent);

    // Render template with data
    const rendered = template(templateData);

    logger.info('Specification rendered successfully', {
      templateName,
      title: templateData.title,
    });

    return rendered;
  } catch (error) {
    logger.error('Failed to render specification', error as Error, {
      templateName,
    });
    throw new Error(`Failed to render specification: ${(error as Error).message}`);
  }
}

/**
 * Render specification from validation responses
 */
export async function renderFromResponses(
  ideaTitle: string,
  author: string,
  responses: Record<string, QuestionResponse>,
  config: TemplateRendererConfig
): Promise<string> {
  const templateData = extractTemplateData(ideaTitle, author, responses);
  return renderSpecification('default', templateData, config);
}

/**
 * Validate rendered specification has all required sections
 */
export function validateRenderedSpec(spec: string): {
  valid: boolean;
  missingSections: string[];
} {
  const requiredSections = [
    '# Feature Specification:',
    '## Summary',
    '## User Scenarios & Testing',
    '## Requirements',
    '## Success Criteria',
  ];

  const missingSections: string[] = [];

  for (const section of requiredSections) {
    if (!spec.includes(section)) {
      missingSections.push(section);
    }
  }

  return {
    valid: missingSections.length === 0,
    missingSections,
  };
}

/**
 * Register custom Handlebars helpers
 */
export function registerHandlebarsHelpers(): void {
  // Helper to format dates
  Handlebars.registerHelper('formatDate', (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  });

  // Helper to uppercase text
  Handlebars.registerHelper('uppercase', (text: string) => {
    return text.toUpperCase();
  });

  // Helper to check if array is not empty
  Handlebars.registerHelper('isNotEmpty', (array: unknown[]) => {
    return array && array.length > 0;
  });

  logger.debug('Handlebars helpers registered');
}

// Register helpers on module load
registerHandlebarsHelpers();
