// Validation Guideline Loader Service
// Based on FR-003: Load validation guidelines from configurable source

import { readFile } from 'fs/promises';
import { join } from 'path';
import yaml from 'js-yaml';
import type { ValidationGuideline } from '../../../../shared/types/template.js';
import { logger } from '../../utils/logger.js';

export interface GuidelineLoaderConfig {
  templatesPath: string;
}

/**
 * Load validation guideline from YAML file
 */
export async function loadGuideline(
  name: string,
  config: GuidelineLoaderConfig
): Promise<ValidationGuideline> {
  try {
    const filePath = join(config.templatesPath, 'validation-guidelines', `${name}.yml`);
    logger.debug('Loading validation guideline', { name, filePath });

    const content = await readFile(filePath, 'utf-8');
    const guideline = yaml.load(content) as ValidationGuideline;

    // Validate structure
    if (!guideline.name || !guideline.questions || !Array.isArray(guideline.questions)) {
      throw new Error('Invalid guideline structure: missing required fields');
    }

    if (guideline.questions.length === 0) {
      throw new Error('Invalid guideline structure: no questions defined');
    }

    // Validate each question
    for (const question of guideline.questions) {
      if (!question.id || !question.text || !question.type) {
        throw new Error(
          `Invalid question structure: missing required fields (id, text, or type)`
        );
      }

      if (question.type === 'multiple-choice' && !question.options) {
        throw new Error(`Multiple-choice question ${question.id} missing options`);
      }

      if (question.type === 'short-answer' && question.maxLength && question.maxLength < 1) {
        throw new Error(`Short-answer question ${question.id} has invalid maxLength`);
      }
    }

    logger.info('Validation guideline loaded successfully', {
      name: guideline.name,
      version: guideline.version,
      questionCount: guideline.questions.length,
    });

    return guideline;
  } catch (error) {
    logger.error('Failed to load validation guideline', error as Error, { name });
    throw new Error(`Failed to load guideline "${name}": ${(error as Error).message}`);
  }
}

/**
 * Load default validation guideline
 */
export async function loadDefaultGuideline(
  config: GuidelineLoaderConfig
): Promise<ValidationGuideline> {
  return loadGuideline('default', config);
}

/**
 * Check if guideline exists
 */
export async function guidelineExists(
  name: string,
  config: GuidelineLoaderConfig
): Promise<boolean> {
  try {
    await loadGuideline(name, config);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get guideline metadata without loading full content
 */
export async function getGuidelineMetadata(
  name: string,
  config: GuidelineLoaderConfig
): Promise<{ name: string; description: string; version: string }> {
  const guideline = await loadGuideline(name, config);
  return {
    name: guideline.name,
    description: guideline.description,
    version: guideline.version,
  };
}
