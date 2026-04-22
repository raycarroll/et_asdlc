// Artifact Model
// Based on specs/001-idea-spec-workflow/data-model.md

import type { ArtifactFileType } from '../../../shared/types/idea.js';

export interface Artifact {
  id: string;
  ideaId: string;
  filePath: string;
  fileType: ArtifactFileType;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
}

export interface ArtifactRecord {
  id: string;
  idea_id: string;
  file_path: string;
  file_type: ArtifactFileType;
  content_type: string | null;
  size_bytes: number | null;
  created_at: Date;
}

/**
 * Convert database record to domain model
 */
export function toDomain(record: ArtifactRecord): Artifact {
  return {
    id: record.id,
    ideaId: record.idea_id,
    filePath: record.file_path,
    fileType: record.file_type,
    contentType: record.content_type,
    sizeBytes: record.size_bytes,
    createdAt: record.created_at,
  };
}

/**
 * Convert domain model to database record
 */
export function toDatabase(artifact: Artifact): Partial<ArtifactRecord> {
  return {
    id: artifact.id,
    idea_id: artifact.ideaId,
    file_path: artifact.filePath,
    file_type: artifact.fileType,
    content_type: artifact.contentType,
    size_bytes: artifact.sizeBytes,
  };
}

/**
 * Validate file size is positive
 */
export function isValidFileSize(sizeBytes: number | null): boolean {
  return sizeBytes === null || sizeBytes > 0;
}

/**
 * Determine file type from path extension
 */
export function inferFileType(filePath: string): ArtifactFileType {
  const ext = filePath.toLowerCase().split('.').pop() || '';

  if (ext === 'md' || ext === 'markdown') {
    return 'specification';
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'mmd', 'mermaid'].includes(ext)) {
    return 'diagram';
  }

  if (['fig', 'sketch', 'psd', 'ai'].includes(ext)) {
    return 'mockup';
  }

  return 'reference';
}

/**
 * Determine content type from file extension
 */
export function inferContentType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop() || '';

  const contentTypeMap: Record<string, string> = {
    md: 'text/markdown',
    markdown: 'text/markdown',
    txt: 'text/plain',
    json: 'application/json',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  };

  return contentTypeMap[ext] || 'application/octet-stream';
}

/**
 * Check if file is an image
 */
export function isImage(artifact: Artifact): boolean {
  return artifact.contentType?.startsWith('image/') ?? false;
}

/**
 * Check if file is text
 */
export function isText(artifact: Artifact): boolean {
  return artifact.contentType?.startsWith('text/') ?? false;
}
