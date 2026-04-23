# File Structure

This directory contains the **source code** for the expand-idea skill.

## Source Files (Committed to Git)

```
expand-idea-skill/
├── scripts/
│   ├── handler.sh             # Main bash script - validation & spec generation
│   └── skill-wrapper.sh       # Claude Code wrapper for /expand_idea
├── install.sh                 # Installation script (dependency checks)
├── config.json                # Configuration template
├── .gitignore                 # Git ignore rules
│
├── Documentation/
│   ├── README.md              # User documentation
│   ├── README-DEV.md          # Developer guide
│   ├── INSTALL.md             # Installation instructions
│   ├── DISTRIBUTION.md        # Distribution options
│   ├── skill.md               # Claude Code skill metadata
│   └── FILES.md               # This file
│
├── templates/                 # Validation & spec templates
│   ├── README.md
│   ├── validation-guidelines/
│   │   ├── default-questions.yaml
│   │   └── default.yml
│   └── spec-templates/
│       ├── default-spec.md
│       └── default.md
│
└── sessions/                  # Session storage (runtime only)
    └── .gitkeep               # Preserves empty directory
```

## Runtime Files (Not Committed)

These are created when the skill runs and are gitignored:

- `sessions/*.json` - User session data (auto-cleaned after 7 days)
- `*.log` - Log files
- `.env`, `.env.local` - Local environment variables

## What This Skill Does

Creates and validates idea specifications **locally only**.

**Usage**: `/expand_idea <idea-description>`

**Process**:
1. Asks validation questions interactively
2. Generates spec from answers
3. Saves to `ideas/YYYYMMDD-HHMMSS-slug/spec.md`

**Output**: Local spec file only (no publishing to central repository)

## Publishing

To publish specs to the central repository, use the **separate** `/publish_idea` skill:

```bash
# Install from separate directory
cd ../publish-idea-skill
./install.sh

# Then use
/publish_idea ideas/20260423-110000-my-idea/spec.md
```

## Total Size

**Source code**: ~72KB
- Scripts: 14KB
- Documentation: 25KB
- Templates: 24KB
- Config: 4KB
- Other: 5KB

**No build artifacts, no dependencies to install**
