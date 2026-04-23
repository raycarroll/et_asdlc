# File Structure

This directory contains the **source code** for the publish-idea skill.

## Source Files (Committed to Git)

```
publish-idea-skill/
├── scripts/
│   ├── publish-idea.sh        # Main bash script - publish to central repo
│   └── publish-idea-wrapper.sh # Claude Code wrapper for /publish_idea
├── install.sh                 # Installation script (dependency checks)
├── config.json                # Configuration template
├── .gitignore                 # Git ignore rules
├── README.md                  # User documentation
├── skill.md                   # Claude Code skill metadata
└── FILES.md                   # This file
```

## Runtime Files (Not Committed)

These are created when the skill runs and are gitignored:

- `*.log` - Log files
- `.env`, `.env.local` - Local environment variables

## What This Skill Does

Publishes locally created specifications to the central ideas repository.

**Usage**: `/publish_idea <spec-file-path>`

**Process**:
1. Reads existing spec.md file
2. Extracts title and metadata
3. POSTs to backend API
4. Backend pushes to ideas_central git repo
5. Backend registers in database

**Output**: Idea ID, git path, commit SHA

## Related Skills

Install `/expand_idea` skill first to create specs:

```bash
# Install expand-idea skill
cd ../expand-idea-skill
./install.sh

# Use it to create specs
/expand_idea Build order tracking system

# Then publish with this skill
/publish_idea ideas/20260423-110000-order-tracking/spec.md
```

## Total Size

**Source code**: ~12KB
- Scripts: 7KB
- Documentation: 4KB
- Config: 0.5KB

**No build artifacts, no dependencies to install**
