// Idea Model
// Based on specs/001-idea-spec-workflow/data-model.md

import type { IdeaStatus } from '../../../shared/types/idea.js';

export interface Idea {
  id: string;
  userId: string;
  title: string;
  status: IdeaStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  gitPath: string;
  gitCommitSha: string | null;
}

export interface IdeaRecord {
  id: string;
  user_id: string;
  title: string;
  status: IdeaStatus;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
  git_path: string;
  git_commit_sha: string | null;
}

/**
 * Convert database record to domain model
 */
export function toDomain(record: IdeaRecord): Idea {
  return {
    id: record.id,
    userId: record.user_id,
    title: record.title,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    publishedAt: record.published_at,
    gitPath: record.git_path,
    gitCommitSha: record.git_commit_sha,
  };
}

/**
 * Convert domain model to database record
 */
export function toDatabase(idea: Idea): Partial<IdeaRecord> {
  return {
    id: idea.id,
    user_id: idea.userId,
    title: idea.title,
    status: idea.status,
    updated_at: idea.updatedAt,
    published_at: idea.publishedAt,
    git_path: idea.gitPath,
    git_commit_sha: idea.gitCommitSha,
  };
}

/**
 * Validate idea title
 */
export function isValidTitle(title: string): boolean {
  return title.length >= 3 && title.length <= 200;
}

/**
 * Validate status transition
 */
export function canTransitionTo(from: IdeaStatus, to: IdeaStatus): boolean {
  const validTransitions: Record<IdeaStatus, IdeaStatus[]> = {
    draft: ['published', 'archived'],
    published: ['archived'],
    archived: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Check if idea is in draft state
 */
export function isDraft(idea: Idea): boolean {
  return idea.status === 'draft';
}

/**
 * Check if idea is published
 */
export function isPublished(idea: Idea): boolean {
  return idea.status === 'published';
}

/**
 * Check if idea is archived
 */
export function isArchived(idea: Idea): boolean {
  return idea.status === 'archived';
}
