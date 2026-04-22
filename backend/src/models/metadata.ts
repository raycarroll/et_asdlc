// MetadataRecord Model
// Based on specs/001-idea-spec-workflow/data-model.md

export interface MetadataRecord {
  id: string;
  ideaId: string;
  summary: string;
  goals: string | null;
  requirements: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MetadataRecordRecord {
  id: string;
  idea_id: string;
  summary: string;
  goals: string | null;
  requirements: string | null;
  tags: string[];
  full_text_search?: unknown; // tsvector - generated column
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database record to domain model
 */
export function toDomain(record: MetadataRecordRecord): MetadataRecord {
  return {
    id: record.id,
    ideaId: record.idea_id,
    summary: record.summary,
    goals: record.goals,
    requirements: record.requirements,
    tags: record.tags,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Convert domain model to database record
 */
export function toDatabase(
  metadata: MetadataRecord
): Partial<MetadataRecordRecord> {
  return {
    id: metadata.id,
    idea_id: metadata.ideaId,
    summary: metadata.summary,
    goals: metadata.goals,
    requirements: metadata.requirements,
    tags: metadata.tags,
    updated_at: metadata.updatedAt,
  };
}

/**
 * Validate summary length
 */
export function isValidSummary(summary: string): boolean {
  return summary.length >= 10 && summary.length <= 250;
}

/**
 * Validate tag format
 */
export function isValidTag(tag: string): boolean {
  const tagRegex = /^[a-z0-9-]{2,50}$/;
  return tagRegex.test(tag);
}

/**
 * Validate tags array
 */
export function isValidTags(tags: string[]): boolean {
  if (tags.length > 20) {
    return false;
  }

  return tags.every(isValidTag);
}

/**
 * Normalize tag (lowercase, alphanumeric + hyphens only)
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract tags from text
 */
export function extractTags(text: string): string[] {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueTags = new Set(
    words
      .filter((word) => word.length >= 2 && word.length <= 50)
      .map(normalizeTag)
  );
  return Array.from(uniqueTags).slice(0, 20);
}
