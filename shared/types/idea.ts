// Shared type definitions for Idea entity
// Based on specs/001-idea-spec-workflow/data-model.md

export type IdeaStatus = 'draft' | 'published' | 'archived';

export interface Idea {
  id: string; // UUID
  userId: string; // UUID
  title: string; // 3-200 characters
  status: IdeaStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  gitPath: string; // Unique path in git repository
  gitCommitSha: string | null; // Latest git commit SHA
}

export interface MetadataRecord {
  id: string; // UUID
  ideaId: string; // UUID
  summary: string; // 10-250 characters
  goals: string | null;
  requirements: string | null;
  tags: string[]; // Max 20 tags, each 2-50 chars
  createdAt: Date;
  updatedAt: Date;
}

export type ArtifactFileType = 'specification' | 'diagram' | 'mockup' | 'reference';

export interface Artifact {
  id: string; // UUID
  ideaId: string; // UUID
  filePath: string; // Relative path in git repo
  fileType: ArtifactFileType;
  contentType: string | null; // MIME type
  sizeBytes: number | null;
  createdAt: Date;
}

export interface Tag {
  id: string; // UUID
  name: string; // 2-50 chars, lowercase, alphanumeric + hyphens
  usageCount: number;
  createdAt: Date;
}

export interface IdeaWithMetadata extends Idea {
  metadata: MetadataRecord;
  artifacts: Artifact[];
  tags: Tag[];
}
