# Idea Validation Templates

This directory contains templates used by the `/expand_idea` command for validating and generating specifications.

## Structure

- **validation-guidelines/**: YAML files defining validation question sequences
- **spec-templates/**: Markdown files with Handlebars placeholders for generating specifications

## Template Files

### Validation Guidelines

Located in `validation-guidelines/`, these YAML files define the questions asked during idea validation:

- `default.yml` - Standard validation for feature ideas
- Additional templates can be added for different idea types (technical-spike, bug-fix, etc.)

### Spec Templates

Located in `spec-templates/`, these Markdown files define the structure of generated specifications:

- `default.md` - Standard feature specification template  
- Additional templates can be added for different specification types

## Version Control

Templates are version-controlled via git commits. The system automatically checks for updates from the central repository every 24 hours and downloads new versions when available.

## Auto-Update

When users install or use the custom Claude command, the system:
1. Checks this git repository for the latest template versions
2. Downloads and applies updates if available
3. Notifies users when templates are updated
4. Falls back to existing templates if updates fail

See `contracts/git-repository.md` for the complete template structure specification.
