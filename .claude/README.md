# Claude Code Configuration

This directory contains Claude Code configuration and project-specific skills for the et_asdlc project.

## Directory Structure

```
.claude/
├── settings.json          # Project-wide Claude settings (if exists)
├── settings.local.json    # Personal overrides (gitignored)
└── skills/                # Project-specific custom skills
    └── speckit-*/         # Spec Kit skills for software development workflow
```

## Skills in This Directory

The skills in `.claude/skills/` are **project-specific** for et_asdlc development:

- `speckit-specify` - Create feature specifications
- `speckit-clarify` - Clarify ambiguous requirements  
- `speckit-plan` - Generate implementation plans
- `speckit-tasks` - Break down into tasks
- `speckit-implement` - Execute implementation
- `speckit-git-*` - Git workflow automation
- `speckit-analyze` - Code analysis
- And more...

These are separate from the **distributable** idea-workflow skills in `/idea-workflow-skills/`.

## Distributable Skills

For the idea workflow skills (expand-idea, publish-idea, submit-idea), see:
- **Source**: `/idea-workflow-skills/`
- **Installation**: `curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash`
- **Target**: `~/.claude/skills/idea-workflow/` (user's home directory)

## Git Tracking

**Committed** (shared with team):
- `.claude/skills/` - Project-specific skills
- `.claude/settings.json` - Team settings (if exists)

**Gitignored** (personal/generated):
- `.claude/settings.local.json` - Personal overrides
- `.claude/**/sessions/` - Session data
- `.claude/**/node_modules/` - Dependencies
- `.claude/**/dist/` - Build artifacts
- `.claude/**/.DS_Store` - macOS metadata

## Usage

Skills in `.claude/skills/` are automatically loaded by Claude Code when working in this project directory.

To use them:
```bash
/speckit-specify "Add user authentication"
/speckit-plan
/speckit-tasks
/speckit-implement
```

For the idea workflow:
```bash
# Install separately to ~/.claude/skills/idea-workflow/
curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash

# Then use
/expand_idea "My idea description"
/submit_idea ideas/*/spec.md
```
