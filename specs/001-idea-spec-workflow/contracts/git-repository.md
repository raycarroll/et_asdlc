# Git Repository Structure Contract

**Repository Type**: Ideas Artifact Storage  
**Version**: 1.0  
**Access**: Read/write via authenticated git operations

---

## Repository Layout

```
ideas-repository/
├── ideas/
│   ├── 001-oauth2-authentication/
│   │   ├── spec.md                    # Main specification
│   │   ├── metadata.json              # Structured metadata
│   │   ├── diagrams/
│   │   │   ├── architecture.png
│   │   │   └── user-flow.svg
│   │   ├── mockups/
│   │   │   └── login-screen.png
│   │   └── references/
│   │       └── oauth2-rfc.pdf
│   ├── 002-analytics-dashboard/
│   │   ├── spec.md
│   │   ├── metadata.json
│   │   └── ...
│   └── ...
├── templates/
│   ├── validation-guidelines/
│   │   ├── default.yml
│   │   ├── technical-spike.yml
│   │   └── bug-fix.yml
│   └── spec-templates/
│       ├── default.md
│       ├── feature-template.md
│       └── bug-template.md
├── .gitignore
└── README.md
```

---

## Directory Conventions

### `/ideas/`

**Purpose**: Storage for published idea artifacts

**Structure**:
- Each idea gets a subdirectory: `{sequence-number}-{slug}/`
- Sequence number: 3-digit zero-padded (001, 002, ..., 999, 1000, ...)
- Slug: Kebab-case title (lowercase, hyphens, alphanumeric only)

**Examples**:
- `001-oauth2-authentication/`
- `042-fix-memory-leak/`
- `137-real-time-analytics-dashboard/`

**Constraints**:
- Directory name must be unique
- Once created, directory name should not change (breaking references)
- Maximum path length: 255 characters

---

### `/ideas/{idea-dir}/spec.md`

**Purpose**: Main specification document

**Format**: Markdown

**Required Sections** (enforced by template):
- Title (H1)
- Summary
- User Scenarios & Testing
- Requirements
- Success Criteria

**Metadata Header** (YAML front matter):
```yaml
---
id: uuid
title: OAuth2 Authentication
author: user@example.com
created: 2026-04-21T14:00:00Z
published: 2026-04-21T15:00:00Z
status: published
tags:
  - authentication
  - oauth2
  - backend
---
```

---

### `/ideas/{idea-dir}/metadata.json`

**Purpose**: Machine-readable metadata for database sync

**Format**: JSON

**Schema**:
```json
{
  "id": "uuid",
  "title": "OAuth2 Authentication",
  "author": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "summary": "Brief summary excerpt (max 250 chars)",
  "goals": "Extracted goals section from spec",
  "requirements": "Extracted requirements list from spec",
  "tags": ["authentication", "oauth2", "backend"],
  "status": "published",
  "gitCommitSha": "abc123...",
  "createdAt": "2026-04-21T14:00:00Z",
  "publishedAt": "2026-04-21T15:00:00Z",
  "artifacts": [
    {
      "filePath": "diagrams/architecture.png",
      "fileType": "diagram",
      "contentType": "image/png",
      "sizeBytes": 45123
    }
  ]
}
```

**Consistency Rule**: `metadata.json` must be kept in sync with `spec.md` header and database record.

---

### `/ideas/{idea-dir}/diagrams/`, `/mockups/`, `/references/`

**Purpose**: Supporting artifacts for the idea

**Allowed File Types**:
- **Diagrams**: `.png`, `.svg`, `.jpg`, `.drawio`, `.mermaid`
- **Mockups**: `.png`, `.jpg`, `.figma`, `.sketch`
- **References**: `.pdf`, `.md`, `.txt`, `.url`

**Size Limits**:
- Individual file: <10 MB
- Total artifacts per idea: <50 MB
- Binary files should be reasonable size (use Git LFS if > 1 MB)

---

### `/templates/`

**Purpose**: Template files for validation and spec generation

**Structure**:
- `validation-guidelines/`: YAML files defining validation question flows
- `spec-templates/`: Markdown files with placeholder syntax for spec generation

**Version Control**:
- Templates are versioned via git tags (e.g., `v1.2.3`)
- Clients reference specific commit SHAs for reproducibility
- Breaking changes require major version bump

---

### `/templates/validation-guidelines/*.yml`

**Purpose**: Define validation question sequences

**Format**: YAML

**Schema**:
```yaml
name: default
description: Standard validation guideline for feature ideas
version: 1.2.3
questions:
  - id: user-goal
    text: "Who is the primary user for this feature?"
    type: multiple-choice
    options:
      - "End users (customers)"
      - "Internal team members"
      - "Developers/integrators"
      - "Other (specify)"
    followup:
      if: "Other (specify)"
      text: "Please describe the user type:"
      
  - id: success-criteria
    text: "What does success look like for this feature?"
    type: short-answer
    maxLength: 200
```

**Validation**: YAML must parse without errors and conform to schema

---

### `/templates/spec-templates/*.md`

**Purpose**: Templates for generating specifications

**Format**: Markdown with Handlebars syntax

**Example**:
```markdown
# Feature Specification: {{title}}

**Author**: {{author}}  
**Created**: {{createdAt}}

## Summary

{{summary}}

## User Scenarios & Testing

{{#each scenarios}}
### {{this.title}}

{{this.description}}

**Acceptance Criteria**:
{{#each this.criteria}}
- {{this}}
{{/each}}
{{/each}}

## Requirements

{{#each requirements}}
- **{{this.id}}**: {{this.description}}
{{/each}}
```

**Placeholders**: Must use valid Handlebars syntax, validated before commit

---

## Commit Message Conventions

### User-generated idea commits

```
Add idea: OAuth2 Authentication (#001)

Summary: Enable users to sign in with Google/GitHub accounts

Author: user@example.com
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Template update commits (admin)

```
Update spec template to include privacy section

- Added "Privacy & Data Protection" mandatory section
- Updated default guidelines for GDPR compliance
- Version bump: 2.0.1 → 2.0.2

Admin: admin@example.com
Timestamp: 2026-04-21T16:00:00Z
```

---

## Branch Strategy

**Main Branch**: `main` (or `master`)
- Protected branch
- Requires successful push to trigger database sync
- Direct commits allowed (no PR workflow for ideas repository)

**Feature Branches** (optional, for template development):
- `templates/feature-name` for template changes
- Merged via PR with validation checks
- Tagged on merge (e.g., `v1.2.4`)

---

## Git Hooks

### Pre-commit (optional)

- Validate `metadata.json` schema
- Ensure `spec.md` has required sections
- Check file size limits
- Lint YAML/Markdown syntax

### Post-receive (server-side)

- Trigger database sync webhook
- Update search index
- Send notifications to subscribers

---

## Access Control

### Read Access

- Public (if open-source) or team-wide (if private)
- No authentication required for reads in public repos

### Write Access

- Authenticated users with valid JWT token
- Token embedded in git credentials via credential helper
- Push requires matching email in commit author and token claims

### Admin Access (Template edits)

- Administrator role required (verified via token claims)
- Template commits tagged with admin identity
- Audit log of all template changes

---

## Conflict Resolution

### Concurrent Idea Publishes

If two users publish simultaneously with same sequence number:

1. First push wins (gets the number)
2. Second push rejected with conflict error
3. Second user's client auto-increments sequence number and retries
4. Eventually consistent (both ideas published with different numbers)

### Template Merge Conflicts

Administrator edits templates via UI (single-writer model):

1. UI fetches latest from git before edit
2. Admin makes changes in UI
3. UI validates changes
4. UI commits and pushes
5. If push rejected (concurrent edit): show error, admin must refresh and retry

---

## Repository Size Management

**Expected Growth**:
- Ideas: ~100-500 KB per idea (mostly text)
- Artifacts: Variable (1-10 MB per idea with images)
- Total: ~1-5 GB over first year with 1000 ideas

**Mitigation**:
- Git LFS for large binary files (>1 MB)
- Periodic garbage collection (`git gc`)
- Archive old/deprecated ideas to separate branch or repo

---

## Disaster Recovery

- **Backup**: Daily automated backups to separate storage
- **Restore**: Clone from backup, sync database from `metadata.json` files
- **Validation**: Integrity check ensures database matches git state

---

## Migration

If repository structure changes in future versions:

1. Create migration script to transform old structure to new
2. Run migration on clone, verify correctness
3. Tag old repo as `archive-v1`, push new repo as `main`
4. Update clients to point to new repo URL
5. Keep old repo read-only for historical reference
