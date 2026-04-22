# Data Model

**Feature**: Idea Validation and Spec Generation Workflow  
**Date**: 2026-04-21  
**Status**: Phase 1 Design

## Entity Relationship Overview

```
User (1) ←→ (N) Idea
User (1) ←→ (N) ConversationSession
User (1) ←→ (N) TemplateEdit (via git commits)

Idea (1) ←→ (1) MetadataRecord
Idea (1) ←→ (N) Artifact
Idea (N) ←→ (N) Tag (many-to-many)

Template (1) ←→ (N) TemplateVersion (git history)
```

---

## Core Entities

### User

**Purpose**: Represents an authenticated individual using the system

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `email` (string, unique, not null): User's email address
- `name` (string, not null): Display name
- `role` (enum: 'user' | 'administrator', not null, default: 'user'): Role for RBAC
- `created_at` (timestamp, not null): Account creation time
- `last_login` (timestamp, nullable): Last authentication time

**Validation Rules**:
- Email must be valid format (RFC 5322)
- Role can only be 'user' or 'administrator'
- Email must be unique across all users

**State Transitions**: None (stateless entity)

**Indexes**:
- Primary: `id`
- Unique: `email`
- Lookup: `role` (for admin queries)

---

### Idea

**Purpose**: Represents a submitted idea with its specification and metadata

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `user_id` (UUID, FK → User.id, not null): Creator
- `title` (string, not null): Idea title (extracted from spec or user-provided)
- `status` (enum: 'draft' | 'published' | 'archived', not null, default: 'draft'): Publication state
- `created_at` (timestamp, not null): Submission time
- `updated_at` (timestamp, not null): Last modification time
- `published_at` (timestamp, nullable): When status changed to 'published'
- `git_path` (string, not null): Path in git repository (e.g., `ideas/001/spec.md`)
- `git_commit_sha` (string, nullable): Latest git commit for this idea's artifacts

**Validation Rules**:
- Title length: 3-200 characters
- Status must be one of the enum values
- `git_path` must be unique
- `published_at` must be null if status != 'published'

**State Transitions**:
```
draft → published → archived
  ↓________↑
```
- Draft to Published: Via successful atomic git+DB publish
- Published to Draft: Not allowed (one-way transition)
- Published to Archived: Admin action or user deletion
- Draft to Archived: User cancels/deletes draft

**Indexes**:
- Primary: `id`
- Foreign key: `user_id`
- Lookup: `status` (for filtering published ideas)
- Lookup: `created_at` (for chronological sorting)
- Unique: `git_path`

---

### MetadataRecord

**Purpose**: Searchable metadata extracted from idea specifications

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `idea_id` (UUID, FK → Idea.id, unique, not null): Associated idea
- `summary` (text, not null): Summary excerpt (~200 chars)
- `goals` (text, nullable): Extracted goals section
- `requirements` (text, nullable): Extracted requirements list
- `tags` (text[], not null, default: []): Array of tag strings
- `full_text_search` (tsvector, generated): PostgreSQL full-text search index
- `created_at` (timestamp, not null): Metadata creation time
- `updated_at` (timestamp, not null): Last metadata update

**Validation Rules**:
- Summary length: 10-250 characters
- Tags: each tag 2-50 characters, lowercase, alphanumeric + hyphens
- Maximum 20 tags per idea

**Indexes**:
- Primary: `id`
- Foreign key: `idea_id` (unique - 1:1 relationship)
- GIN index: `full_text_search` (for full-text queries)
- GIN index: `tags` (for tag filtering)

**Full-Text Search**:
```sql
full_text_search = to_tsvector('english', 
  coalesce(summary, '') || ' ' || 
  coalesce(goals, '') || ' ' || 
  coalesce(requirements, '')
)
```

---

### Artifact

**Purpose**: References to files associated with an idea (stored in git)

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `idea_id` (UUID, FK → Idea.id, not null): Parent idea
- `file_path` (string, not null): Relative path in git repo (e.g., `diagrams/flow.png`)
- `file_type` (enum: 'specification' | 'diagram' | 'mockup' | 'reference', not null): Categorization
- `content_type` (string, nullable): MIME type (e.g., `image/png`, `text/markdown`)
- `size_bytes` (integer, nullable): File size
- `created_at` (timestamp, not null): When artifact was added

**Validation Rules**:
- `file_path` must be unique per `idea_id`
- `file_type` must be one of enum values
- `size_bytes` must be positive if provided

**Indexes**:
- Primary: `id`
- Foreign key: `idea_id`
- Unique: `(idea_id, file_path)` composite

---

### Tag

**Purpose**: Normalized tags for filtering (materialized from MetadataRecord.tags)

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `name` (string, unique, not null): Tag name (lowercase, normalized)
- `usage_count` (integer, not null, default: 0): Number of ideas using this tag
- `created_at` (timestamp, not null): First use

**Validation Rules**:
- Name: 2-50 characters, lowercase, alphanumeric + hyphens only
- `usage_count` must be non-negative

**Indexes**:
- Primary: `id`
- Unique: `name`
- Lookup: `usage_count DESC` (for popular tags)

**Note**: This is a materialized view - tags are extracted from `MetadataRecord.tags` array and maintained via triggers or application logic.

---

### ConversationSession

**Purpose**: Tracks validation conversation state for pause/resume

**Attributes**:
- `id` (UUID, PK): Session identifier
- `user_id` (UUID, FK → User.id, not null): User conducting validation
- `idea_title` (string, nullable): Working title of idea being validated
- `current_question_index` (integer, not null, default: 0): Progress through validation questions
- `responses` (JSONB, not null, default: '{}'): User responses keyed by question ID
- `partial_spec` (text, nullable): Partially generated specification content
- `status` (enum: 'active' | 'completed' | 'abandoned', not null, default: 'active'): Session state
- `created_at` (timestamp, not null): Session start time
- `updated_at` (timestamp, not null): Last interaction time
- `expires_at` (timestamp, not null): Auto-cleanup threshold

**Validation Rules**:
- `current_question_index` must be non-negative
- `expires_at` must be >= `created_at`
- `responses` must be valid JSON object

**State Transitions**:
```
active → completed
   ↓
abandoned
```
- Active to Completed: Validation finished, spec generated
- Active to Abandoned: User stopped, `updated_at` > retention period
- Completed/Abandoned: No further transitions (terminal states)

**Indexes**:
- Primary: `id`
- Foreign key: `user_id`
- Lookup: `expires_at` (for cleanup queries)
- Lookup: `(user_id, status)` (for user's active sessions)

---

### Template

**Purpose**: References to template files in git repository

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `name` (string, unique, not null): Template name (e.g., `default-spec-template`)
- `file_path` (string, not null): Path in template git repo
- `template_type` (enum: 'spec' | 'guideline', not null): Template category
- `current_version_sha` (string, not null): Git commit SHA of current version
- `last_sync_at` (timestamp, not null): When template was last fetched from git
- `created_at` (timestamp, not null): First registration time
- `updated_at` (timestamp, not null): Last update time

**Validation Rules**:
- Name: 3-100 characters, alphanumeric + hyphens/underscores
- `current_version_sha` must be valid git SHA (40 hex chars)
- `template_type` must be 'spec' or 'guideline'

**Indexes**:
- Primary: `id`
- Unique: `name`
- Lookup: `template_type` (for filtering by type)

---

### TemplateUpdateCache

**Purpose**: Tracks template update check timing to enforce 24-hour interval

**Attributes**:
- `id` (UUID, PK): Unique identifier (typically singleton per user or global)
- `last_check_timestamp` (timestamp, not null): When update check was last performed
- `last_successful_update` (timestamp, nullable): When templates were last actually updated
- `current_version_sha` (string, not null): Git commit SHA of currently cached templates
- `next_check_due` (timestamp, generated): `last_check_timestamp` + 24 hours

**Validation Rules**:
- `last_check_timestamp` <= current time
- If `last_successful_update` is set, it must be <= `last_check_timestamp`

**Indexes**:
- Primary: `id`
- Lookup: `next_check_due` (for determining if check is needed)

---

## Many-to-Many Relationships

### IdeaTag (Join Table)

**Purpose**: Associates ideas with tags

**Attributes**:
- `idea_id` (UUID, FK → Idea.id, not null)
- `tag_id` (UUID, FK → Tag.id, not null)
- `created_at` (timestamp, not null): When tag was applied

**Validation Rules**: None (foreign key constraints sufficient)

**Indexes**:
- Composite PK: `(idea_id, tag_id)`
- Foreign keys: `idea_id`, `tag_id`

---

## Derived/Computed Fields

### User.ideas_count
**Computation**: `COUNT(Idea WHERE user_id = User.id AND status = 'published')`

### Tag.usage_count
**Computation**: `COUNT(IdeaTag WHERE tag_id = Tag.id)`

### Idea.artifact_count
**Computation**: `COUNT(Artifact WHERE idea_id = Idea.id)`

---

## Data Volume Estimates

Assuming 1000 ideas over first year:

| Entity | Estimated Rows | Growth Rate |
|--------|----------------|-------------|
| User | 100 | Slow (10/month) |
| Idea | 1,000 | Medium (100/month) |
| MetadataRecord | 1,000 | Matches Idea (1:1) |
| Artifact | 2,000 | Medium (2 per idea avg) |
| Tag | 200 | Slow (stabilizes over time) |
| IdeaTag | 5,000 | Medium (5 tags per idea avg) |
| ConversationSession | 500 active, 5,000 total | High (cleanup needed) |
| Template | 20 | Slow (rare changes) |
| TemplateUpdateCache | 1-100 | Minimal (per user or global) |

**Storage**: PostgreSQL database ~100-500 MB, Git repository 1-5 GB (depending on artifact sizes)

---

## Consistency Constraints

1. **Idea ↔ MetadataRecord**: Every published Idea must have exactly one MetadataRecord
2. **Idea ↔ Git**: `Idea.git_path` must correspond to an actual path in the git repository
3. **Template ↔ Git**: `Template.file_path` must exist in template git repository at `current_version_sha`
4. **Atomic Publishing**: When `Idea.status` transitions to 'published', both git commit and MetadataRecord insertion must succeed or both must roll back
5. **Tag Normalization**: All tags in `MetadataRecord.tags[]` must have corresponding entries in `Tag` table (maintained via triggers)

---

## Migration Considerations

- **Phase 1**: Core tables (User, Idea, MetadataRecord, Artifact)
- **Phase 2**: Tagging (Tag, IdeaTag), with backfill from existing MetadataRecord.tags
- **Phase 3**: Sessions (ConversationSession)
- **Phase 4**: Templates (Template, TemplateUpdateCache)

Each phase can be deployed independently if schema evolution is managed carefully (backward-compatible changes).
