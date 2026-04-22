// Template Model
// Domain model for template management
// Based on specs/001-idea-spec-workflow/data-model.md

export type TemplateType = 'spec' | 'guideline' | 'validation';

export interface Template {
  id: string; // UUID
  type: TemplateType;
  filePath: string; // Relative path in git repository
  name: string; // Display name
  description: string | null;
  currentVersionSha: string | null; // Git commit SHA for current version
  lastModifiedBy: string | null; // User ID of last modifier
  lastModifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateRow {
  id: string;
  type: string;
  file_path: string;
  name: string;
  description: string | null;
  current_version_sha: string | null;
  last_modified_by: string | null;
  last_modified_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database row to domain model
 */
export function templateFromRow(row: TemplateRow): Template {
  return {
    id: row.id,
    type: row.type as TemplateType,
    filePath: row.file_path,
    name: row.name,
    description: row.description,
    currentVersionSha: row.current_version_sha,
    lastModifiedBy: row.last_modified_by,
    lastModifiedAt: row.last_modified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert domain model to database row
 */
export function templateToRow(template: Template): Partial<TemplateRow> {
  return {
    id: template.id,
    type: template.type,
    file_path: template.filePath,
    name: template.name,
    description: template.description,
    current_version_sha: template.currentVersionSha,
    last_modified_by: template.lastModifiedBy,
    last_modified_at: template.lastModifiedAt,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

/**
 * Validate template type
 */
export function isValidTemplateType(type: string): type is TemplateType {
  return ['spec', 'guideline', 'validation'].includes(type);
}

/**
 * Get file extension for template type
 */
export function getTemplateExtension(type: TemplateType): string {
  switch (type) {
    case 'spec':
      return '.md';
    case 'guideline':
      return '.yml';
    case 'validation':
      return '.yml';
  }
}

/**
 * Infer template type from file path
 */
export function inferTemplateType(filePath: string): TemplateType | null {
  if (filePath.includes('/spec-templates/')) {
    return 'spec';
  }
  if (filePath.includes('/validation-guidelines/')) {
    return 'guideline';
  }
  if (filePath.includes('/validation/')) {
    return 'validation';
  }
  return null;
}

/**
 * Validate template file path
 */
export function isValidTemplatePath(filePath: string): boolean {
  // Must be a relative path
  if (filePath.startsWith('/')) {
    return false;
  }

  // Must be within templates directory
  if (!filePath.startsWith('templates/')) {
    return false;
  }

  // Must have valid extension
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  return ['.md', '.yml', '.yaml', '.json'].includes(ext);
}

/**
 * Generate display name from file path
 */
export function generateTemplateName(filePath: string): string {
  // Extract filename without extension
  const filename = filePath.split('/').pop() || '';
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));

  // Convert dashes/underscores to spaces and capitalize words
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
