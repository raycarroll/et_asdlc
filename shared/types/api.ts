// Shared type definitions for API request/response contracts
// Based on specs/001-idea-spec-workflow/contracts/api.md

import { Idea, MetadataRecord, Artifact, IdeaWithMetadata } from './idea.js';
import { Template } from './template.js';

// Authentication

export type UserRole = 'user' | 'administrator';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  expiresAt: string; // ISO 8601
}

export interface RefreshTokenRequest {
  token: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresAt: string; // ISO 8601
}

// Ideas

export interface ListIdeasQueryParams {
  page?: number; // Default: 1
  pageSize?: number; // Default: 20, max: 100
  author?: string;
  status?: 'published' | 'draft' | 'archived';
  tags?: string; // Comma-separated
  dateFrom?: string; // ISO 8601
  dateTo?: string; // ISO 8601
  search?: string; // Full-text search
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListIdeasResponse {
  ideas: Array<{
    id: string;
    title: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    status: string;
    summary: string;
    tags: string[];
    createdAt: string; // ISO 8601
    publishedAt: string | null; // ISO 8601
  }>;
  pagination: PaginationMetadata;
}

export interface GetIdeaResponse {
  id: string;
  title: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  metadata: {
    summary: string;
    goals: string | null;
    requirements: string | null;
    tags: string[];
  };
  artifacts: Array<{
    id: string;
    filePath: string;
    fileType: string;
    contentType: string | null;
    sizeBytes: number | null;
    url: string;
  }>;
  gitPath: string;
  gitCommitSha: string | null;
  createdAt: string; // ISO 8601
  publishedAt: string | null; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface PublishIdeaRequest {
  title: string;
  specification: string; // Markdown content
  artifacts?: Array<{
    filePath: string;
    content: string; // Base64-encoded
    contentType: string;
  }>;
  tags: string[];
  metadata: {
    summary: string;
    goals: string;
    requirements: string;
  };
}

export interface PublishIdeaResponse {
  id: string;
  title: string;
  gitPath: string;
  gitCommitSha: string;
  status: string;
  createdAt: string; // ISO 8601
  publishedAt: string; // ISO 8601
}

// Templates (Admin Only)

export interface ListTemplatesQueryParams {
  type?: 'spec' | 'guideline';
}

export interface ListTemplatesResponse {
  templates: Array<{
    id: string;
    name: string;
    filePath: string;
    templateType: 'spec' | 'guideline';
    currentVersionSha: string;
    lastSyncAt: string; // ISO 8601
  }>;
}

export interface GetTemplateResponse {
  id: string;
  name: string;
  content: string;
  filePath: string;
  templateType: 'spec' | 'guideline';
  currentVersionSha: string;
  lastSyncAt: string; // ISO 8601
}

export interface UpdateTemplateRequest {
  content: string;
  commitMessage: string;
}

export interface UpdateTemplateResponse {
  id: string;
  currentVersionSha: string;
  validationResults: {
    syntax: 'valid' | 'invalid';
    semantic: 'valid' | 'invalid';
  };
  updatedAt: string; // ISO 8601
}

// Health

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string; // ISO 8601
  services: {
    database: 'connected' | 'disconnected';
    git: 'accessible' | 'inaccessible';
    templateSync: 'up-to-date' | 'outdated' | 'error';
  };
}

// Error Response

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      reason?: string;
      [key: string]: unknown;
    };
  };
  timestamp: string; // ISO 8601
}
