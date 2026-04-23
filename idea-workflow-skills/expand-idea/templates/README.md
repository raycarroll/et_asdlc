# Template Repository

This directory contains validation guidelines and specification templates used by the idea workflow system.

**GitHub Repository**: https://github.com/raycarroll/et_asdlc.git

## Purpose

The `/expand-idea` command pulls templates from this GitHub repository to:
1. **Validate ideas** through guided questions
2. **Generate specifications** from standardized templates

## Structure

```
templates/
  ├── validation-guidelines/
  │   ├── default-questions.yaml    # Default validation questions
  │   └── default.yml               # Original format (legacy)
  │
  └── spec-templates/
      ├── default-spec.md            # Default specification template
      └── default.md                 # Original format (legacy)
```

## Validation Guidelines

YAML files defining questions to ask users when validating ideas:

**Fields:**
- `id`: Unique identifier for the question
- `category`: problem, solution, validation, implementation, context
- `text`: The question to display to the user
- `required`: Boolean - must be answered?
- `options`: List of predefined answers (optional)
- `validation`: min_length, max_length constraints

**Example** (`default-questions.yaml`):
```yaml
questions:
  - id: problem_statement
    category: problem
    text: "What problem does this solve?"
    required: true
    validation:
      min_length: 50
      max_length: 1000
```

## Spec Templates

Markdown templates with placeholders for generated specifications:

**Placeholders:**
- `{{title}}` - Idea title
- `{{author_name}}` - User who created the idea
- `{{created_date}}` - Timestamp
- `{{problem_statement}}` - Extracted from validation
- `{{proposed_solution}}` - Extracted from validation
- `{{user_stories}}` - Extracted from validation

**Example** (`default-spec.md`):
```markdown
# {{title}}

**Created**: {{created_date}}  
**Author**: {{author_name}}

## Problem Statement

{{problem_statement}}

## Proposed Solution

{{proposed_solution}}
```

## Auto-Updates from GitHub

The backend automatically checks this repository every 24 hours for template updates:

1. **Check**: Compare local version SHA with remote `main` branch on GitHub
2. **Download**: If updates exist, pull latest templates via git
3. **Cache**: Store version SHA in database for next check
4. **Notify**: Display notification about updates

**Configuration** (OpenShift ConfigMap):
```yaml
TEMPLATES_REPO_URL: "https://github.com/raycarroll/et_asdlc.git"
TEMPLATES_REPO_PATH: "/app/data/templates-repo"
TEMPLATE_UPDATE_INTERVAL_HOURS: "24"
```

## Creating Custom Templates

### Add a New Validation Guideline

1. Create `templates/validation-guidelines/my-guideline.yaml`
2. Define questions following the schema above
3. Commit and push to GitHub
4. Backend will auto-update within 24 hours (or restart pod to force)

### Add a New Spec Template

1. Create `templates/spec-templates/my-template.md`
2. Use `{{placeholders}}` matching your guideline question IDs
3. Commit and push to GitHub
4. Reference it in `/expand-idea` command

## GitHub Repository Structure

This repository serves **dual purposes**:

1. **Codebase**: Backend, frontend, deployment configs
2. **Central Storage**: Templates + published ideas

```
et_asdlc/
  ├── backend/           # Node.js API
  ├── frontend/          # Next.js UI
  ├── ideas/             # Published ideas registry
  ├── templates/         # Validation guidelines & spec templates
  └── openshift/         # Deployment configs
```

## Version Tracking

Template versions are tracked by git commit SHA:
- Stored in PostgreSQL table `template_cache`
- Displayed in update notifications
- Used for rollback if needed

## Troubleshooting

**Templates not updating:**
- Check backend logs: `kubectl logs -n idea-workflow -l app=backend`
- Verify ConfigMap has correct `TEMPLATES_REPO_URL`
- Ensure backend pod can access GitHub
- Check database: `SELECT * FROM template_cache;`

**Validation errors:**
- Verify YAML syntax in guideline files
- Check question IDs match template placeholders
- Review backend logs for parsing errors

**Template rendering issues:**
- Verify placeholder syntax `{{variable_name}}`
- Ensure guideline question IDs match template variables
- Check backend logs for rendering errors
