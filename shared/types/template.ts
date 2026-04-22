// Shared type definitions for Template entity
// Based on specs/001-idea-spec-workflow/data-model.md

export type TemplateType = 'spec' | 'guideline';

export interface Template {
  id: string; // UUID
  name: string; // 3-100 chars, alphanumeric + hyphens/underscores
  filePath: string; // Path in template git repo
  templateType: TemplateType;
  currentVersionSha: string; // Git commit SHA (40 hex chars)
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateUpdateCache {
  id: string; // UUID
  lastCheckTimestamp: Date;
  lastSuccessfulUpdate: Date | null;
  currentVersionSha: string; // Git commit SHA (40 hex chars)
  nextCheckDue: Date; // Computed: lastCheckTimestamp + 24 hours
}

// Validation Guideline structure (loaded from YAML)
export interface ValidationQuestion {
  id: string;
  text: string;
  type: 'multiple-choice' | 'short-answer';
  options?: string[];
  maxLength?: number;
  followup?: {
    if: string;
    text: string;
  };
}

export interface ValidationGuideline {
  name: string;
  description: string;
  version: string;
  questions: ValidationQuestion[];
}

// Spec Template Placeholders (for Handlebars)
export interface SpecTemplateData {
  title: string;
  author: string;
  createdAt: string;
  summary: string;
  scenarios?: Array<{
    title: string;
    description: string;
    criteria: string[];
  }>;
  requirements?: Array<{
    id: string;
    description: string;
  }>;
  successCriteria?: string;
  [key: string]: unknown; // Allow additional custom fields
}
