# Idea Publishing Workflow Diagram

This artifact demonstrates how supporting files can be included with ideas.

## Workflow Steps

```
┌─────────────────────────────────────────────────────────────────┐
│                      /expand-idea Command                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Load Validation Guidelines from GitHub                      │
│     - Fetch templates/validation-guidelines/default-questions    │
│     - Parse YAML structure                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Interactive Q&A Session                                      │
│     - Present questions one at a time                            │
│     - Validate responses                                         │
│     - Save session state (pause/resume)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Generate Specification                                       │
│     - Load templates/spec-templates/default-spec.md              │
│     - Replace {{placeholders}} with user answers                 │
│     - Validate required sections                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Atomic Publish (Git + Database)                              │
│     ┌────────────────────────────────────────────────────────┐  │
│     │  BEGIN TRANSACTION                                      │  │
│     │                                                         │  │
│     │  4a. Git Operations:                                   │  │
│     │      - Create ideas/YYYYMMDD-HHMMSS-slug/              │  │
│     │      - Write spec.md                                   │  │
│     │      - Write metadata.json                             │  │
│     │      - git add, commit, push                           │  │
│     │                                                         │  │
│     │  4b. Database Operations:                              │  │
│     │      - INSERT INTO ideas (...)                         │  │
│     │      - Record git_commit_sha                           │  │
│     │                                                         │  │
│     │  COMMIT (if both succeed)                              │  │
│     │  ROLLBACK + git revert (if either fails)               │  │
│     └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Success Notification                                         │
│     - Display idea ID and GitHub URL                             │
│     - Show git commit SHA                                        │
│     - Provide next steps                                         │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure Created

```
ideas/20260422-160402-test-idea/
├── spec.md              # Generated from template
├── metadata.json        # System metadata
└── artifacts/           # Supporting files (optional)
    └── workflow-diagram.md
```

## Database Record

```sql
INSERT INTO ideas (
  id,
  user_id,
  title,
  status,
  git_path,
  git_commit_sha,
  created_at,
  published_at
) VALUES (
  uuid_generate_v4(),
  '96e9c32a-2e76-4f7c-ac4a-fed9523b86d2',
  'Test Idea for Idea Workflow System',
  'published',
  'ideas/20260422-160402-test-idea/spec.md',
  'abc123...',
  NOW(),
  NOW()
);
```

## Rollback on Failure

If git push succeeds but database insert fails:

```typescript
// Revert git commit
await git.revert(commitSha);
await git.push('origin', 'main', ['--force']);

// Rollback database transaction
await db.query('ROLLBACK');

// Notify user
console.error('Publish failed - all changes rolled back');
```

This ensures no partial publishes (either both git and database succeed, or neither).
