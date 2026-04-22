// Metadata Extraction Service
// Parses specifications and extracts structured metadata fields
// Based on specs/001-idea-spec-workflow/data-model.md

import { logger } from '../../utils/logger.js';
import { normalizeTag } from '../../models/metadata.js';

export interface ExtractedMetadata {
  summary: string;
  goals: string | null;
  requirements: string | null;
  tags: string[];
}

/**
 * Extract metadata from specification content
 * Parses Markdown structure and extracts key sections
 */
export function extractMetadata(specContent: string): ExtractedMetadata {
  logger.debug('Extracting metadata from specification', {
    contentLength: specContent.length,
  });

  const metadata: ExtractedMetadata = {
    summary: extractSummary(specContent),
    goals: extractSection(specContent, ['Goal', 'Goals', 'Objectives']),
    requirements: extractSection(specContent, [
      'Requirements',
      'Functional Requirements',
      'Features',
    ]),
    tags: extractTags(specContent),
  };

  logger.info('Metadata extracted', {
    summary: metadata.summary.substring(0, 50) + '...',
    goalsLength: metadata.goals?.length ?? 0,
    requirementsLength: metadata.requirements?.length ?? 0,
    tagCount: metadata.tags.length,
  });

  return metadata;
}

/**
 * Extract summary from specification
 * Uses the first paragraph or summary section
 */
function extractSummary(content: string): string {
  // Try to find Summary section first
  const summaryMatch = content.match(
    /##\s+Summary\s*\n\s*(.+?)(?:\n\n|\n##|$)/is
  );

  if (summaryMatch && summaryMatch[1]) {
    const summary = summaryMatch[1].trim();
    return truncateSummary(summary);
  }

  // Fall back to first paragraph after title
  const lines = content.split('\n');
  let summary = '';
  let skipTitle = true;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip title (first # heading)
    if (skipTitle && trimmed.startsWith('#')) {
      skipTitle = false;
      continue;
    }

    // Collect paragraph content
    if (trimmed && !trimmed.startsWith('#')) {
      summary += (summary ? ' ' : '') + trimmed;

      // Stop after first paragraph
      if (summary.length > 50) {
        break;
      }
    } else if (summary) {
      break;
    }
  }

  return truncateSummary(summary || 'No summary available');
}

/**
 * Truncate summary to required length (10-250 chars)
 */
function truncateSummary(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (cleaned.length < 10) {
    return cleaned.padEnd(10, '.');
  }

  if (cleaned.length > 250) {
    return cleaned.substring(0, 247) + '...';
  }

  return cleaned;
}

/**
 * Extract a specific section from specification
 */
function extractSection(content: string, headings: string[]): string | null {
  for (const heading of headings) {
    const regex = new RegExp(
      `##\\s+${heading}\\s*\\n\\s*(.+?)(?:\\n\\n##|$)`,
      'is'
    );
    const match = content.match(regex);

    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract tags from specification content
 * Looks for explicit tag sections and extracts keywords
 */
function extractTags(content: string): string[] {
  const tags = new Set<string>();

  // Look for explicit Tags/Labels section
  const tagsSection = extractSection(content, ['Tags', 'Labels', 'Keywords']);

  if (tagsSection) {
    const explicitTags = tagsSection
      .split(/[,;\n]/)
      .map((tag) => normalizeTag(tag))
      .filter((tag) => tag.length >= 2 && tag.length <= 50);

    explicitTags.forEach((tag) => tags.add(tag));
  }

  // Extract keywords from title and summary
  const title = extractTitle(content);
  const summary = extractSummary(content);

  const keywords = extractKeywords(title + ' ' + summary);
  keywords.forEach((keyword) => tags.add(keyword));

  // Limit to 20 tags
  return Array.from(tags).slice(0, 20);
}

/**
 * Extract title from specification
 */
function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : '';
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // Split on word boundaries and filter
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];

  // Common stop words to exclude
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'could',
    'can',
    'may',
    'might',
    'must',
    'this',
    'that',
    'these',
    'those',
  ]);

  const keywords = words
    .filter((word) => word.length >= 3 && !stopWords.has(word))
    .map(normalizeTag)
    .filter((tag) => tag.length >= 2);

  // Get unique keywords
  return Array.from(new Set(keywords));
}

/**
 * Validate extracted metadata meets requirements
 */
export function validateMetadata(metadata: ExtractedMetadata): boolean {
  // Summary must be 10-250 characters
  if (metadata.summary.length < 10 || metadata.summary.length > 250) {
    logger.warn('Invalid summary length', {
      length: metadata.summary.length,
    });
    return false;
  }

  // Tags must be valid format and count
  if (metadata.tags.length > 20) {
    logger.warn('Too many tags', { count: metadata.tags.length });
    return false;
  }

  for (const tag of metadata.tags) {
    if (tag.length < 2 || tag.length > 50) {
      logger.warn('Invalid tag length', { tag, length: tag.length });
      return false;
    }

    if (!/^[a-z0-9-]+$/.test(tag)) {
      logger.warn('Invalid tag format', { tag });
      return false;
    }
  }

  return true;
}
