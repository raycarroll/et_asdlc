// Tag Model
// Based on specs/001-idea-spec-workflow/data-model.md

export interface Tag {
  id: string;
  name: string;
  usageCount: number;
  createdAt: Date;
}

export interface TagRecord {
  id: string;
  name: string;
  usage_count: number;
  created_at: Date;
}

/**
 * Convert database record to domain model
 */
export function toDomain(record: TagRecord): Tag {
  return {
    id: record.id,
    name: record.name,
    usageCount: record.usage_count,
    createdAt: record.created_at,
  };
}

/**
 * Convert domain model to database record
 */
export function toDatabase(tag: Tag): Partial<TagRecord> {
  return {
    id: tag.id,
    name: tag.name,
    usage_count: tag.usageCount,
  };
}

/**
 * Validate tag name format
 */
export function isValidName(name: string): boolean {
  const tagRegex = /^[a-z0-9-]{2,50}$/;
  return tagRegex.test(name);
}

/**
 * Normalize tag name (lowercase, alphanumeric + hyphens only)
 */
export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Increment usage count
 */
export function incrementUsage(tag: Tag): Tag {
  return {
    ...tag,
    usageCount: tag.usageCount + 1,
  };
}

/**
 * Decrement usage count
 */
export function decrementUsage(tag: Tag): Tag {
  return {
    ...tag,
    usageCount: Math.max(0, tag.usageCount - 1),
  };
}

/**
 * Check if tag is unused
 */
export function isUnused(tag: Tag): boolean {
  return tag.usageCount === 0;
}
