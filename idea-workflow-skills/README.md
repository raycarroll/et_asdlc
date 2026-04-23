# Idea Workflow Skills

Three Claude Code skills that implement a workflow for creating, validating, and publishing idea specifications.

## Quick Start

### Remote Installation (Recommended)

```bash
# Install all skills to ~/.claude/skills/idea-workflow
curl -fsSL https://raw.githubusercontent.com/raycarroll/et_asdlc/main/idea-workflow-skills/install.sh | bash

# Set up authentication
export AUTH_TOKEN='your-api-token'

# Use the workflow
/expand_idea "Add user authentication with OAuth2"
/submit_idea ideas/20260423-110000-oauth2-auth/spec.md
```

### Local Installation

```bash
# Clone or download the repository, then:
cd idea-workflow-skills
./install.sh

# Or install to custom directory
./install.sh --target-dir ~/.claude/skills/my-ideas
```

## Overview

This skill suite implements a two-stage workflow:

**Stage 1: Specify** - Create idea specifications locally  
**Stage 2: Submit** - Validate and publish to central repository

## Skills

### 1. `/expand_idea` - Create Specification

Creates and validates idea specifications locally through interactive Q&A.

**Directory**: `expand-idea/`

**Usage**:
```
/expand_idea <idea-description>
```

**Output**: Creates `ideas/YYYYMMDD-HHMMSS-slug/spec.md`

**Details**: See [expand-idea/README.md](expand-idea/README.md) and [expand-idea/skill.md](expand-idea/skill.md)

---

### 2. `/publish_idea` - Publish to Central Repository

Manually publishes a specification to the central ideas repository via backend API.

**Directory**: `publish-idea/`

**Usage**:
```
/publish_idea <spec-file-path>
```

**Example**: `/publish_idea ideas/20260423-110000-my-idea/spec.md`

**Details**: See [publish-idea/README.md](publish-idea/README.md) and [publish-idea/skill.md](publish-idea/skill.md)

---

### 3. `/submit_idea` - Validate and Publish

Runs validation gates, then automatically publishes if all gates pass.

**Directory**: `submit-idea/`

**Usage**:
```
/submit_idea <spec-file-path>
```

**Gates**:
- **Artifact Check**: spec.md exists, minimum 100 bytes
- **Content Validation**: Has title, Problem Statement, Proposed Solution sections

**On Success**: Automatically invokes `/publish_idea`

**Details**: See [submit-idea/README.md](submit-idea/README.md) and [submit-idea/skill.md](submit-idea/skill.md)

---

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Specify                                            │
│ /expand_idea "My idea description"                         │
│                                                             │
│ → Interactive Q&A                                           │
│ → Generate spec.md                                          │
│ → Save to ideas/YYYYMMDD-HHMMSS-slug/spec.md              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Submit                                             │
│ /submit_idea ideas/YYYYMMDD-HHMMSS-slug/spec.md           │
│                                                             │
│ → Gate 1: Artifact Check                                    │
│   ✓ spec.md exists                                          │
│   ✓ spec.md minimum size                                    │
│                                                             │
│ → Gate 2: Content Validation                                │
│   ✓ Has title                                               │
│   ✓ Has Problem Statement                                   │
│   ✓ Has Proposed Solution                                   │
│   ⚠ Has Success Criteria (warning)                          │
│                                                             │
│ → If gates pass: invoke /publish_idea                       │
│   → POST to backend API                                     │
│   → Backend: git push + database insert (atomic)            │
└─────────────────────────────────────────────────────────────┘
```

## Installation

The installer can run remotely (via curl) or locally, and installs skills to your Claude Code skills directory.

### Remote Installation

**Install all skills** (default location: `~/.claude/skills/idea-workflow`):
```bash
curl -fsSL https://raw.githubusercontent.com/raycarroll/et_asdlc/main/idea-workflow-skills/install.sh | bash
```

**Install with options**:
```bash
# Install only expand-idea
curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash -s -- --expand-only

# Install to custom directory
curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash -s -- --target-dir ~/.claude/skills/my-ideas

# Force overwrite existing installation
curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash -s -- --force
```

### Local Installation

```bash
# From repository directory
cd idea-workflow-skills
./install.sh

# Install to custom directory
./install.sh --target-dir ~/.claude/skills/my-ideas

# Install specific skills only
./install.sh --expand-only
./install.sh --publish-only
./install.sh --submit-only
```

### Installation Options

| Option | Description |
|--------|-------------|
| `--target-dir DIR` | Install to specified directory (default: `~/.claude/skills/idea-workflow`) |
| `--expand-only` | Install only expand-idea skill |
| `--publish-only` | Install only publish-idea skill |
| `--submit-only` | Install only submit-idea skill |
| `--local-source DIR` | Install from local directory instead of downloading |
| `--force` | Overwrite existing installation without prompting |
| `--skip-deps-check` | Skip dependency checks |
| `--help` | Show help message |

### What the Installer Does

1. **Checks dependencies**: bash, jq, git, yq/python3, curl
2. **Downloads skills** (if remote) or uses local files
3. **Copies to target directory**: Default `~/.claude/skills/idea-workflow/`
4. **Makes scripts executable**: All `.sh` files in `scripts/` directories
5. **Validates configuration**: Checks `config.json` files are valid JSON
6. **Shows setup instructions**: Next steps for configuration


## Configuration

After installation, configure the skills for your environment.

### Environment Variables

```bash
# Required for publishing
export AUTH_TOKEN='your-api-token'
```

Add to `~/.bashrc` or `~/.zshrc` for persistence:
```bash
echo 'export AUTH_TOKEN="your-token"' >> ~/.bashrc
source ~/.bashrc
```

### Backend API Configuration

Edit the `config.json` files in the installed skills directory (default: `~/.claude/skills/idea-workflow/`):

**publish-idea/config.json**:
```json
{
  "backendApiUrl": "https://backend-api.example.com/api/v1",
  "authToken": "${AUTH_TOKEN}"
}
```

**submit-idea/config.json**:
```json
{
  "workflowDefinition": "./workflows/idea-workflow.yaml",
  "publishSkillPath": "../publish-idea/scripts/publish-idea.sh"
}
```

**expand-idea/config.json**:
```json
{
  "backendApiUrl": "https://backend-api.example.com/api/v1",
  "authToken": "${AUTH_TOKEN}"
}
```

The `${AUTH_TOKEN}` placeholder is substituted at runtime using `envsubst`.

### Workflow Definition

The workflow gates are defined in `submit-idea/workflows/idea-workflow.yaml`.

To update from central repository:
```bash
curl -o submit-idea/workflows/idea-workflow.yaml \
  https://raw.githubusercontent.com/your-org/ideas_central/main/workflows/idea-workflow.yaml
```

## Dependencies

### All Skills
- `bash` 4.0+
- `jq` - JSON processor

### expand-idea
- `yq` OR `python3` - YAML parser

### publish-idea, submit-idea
- `curl` - HTTP client

Install missing dependencies:
```bash
# macOS
brew install jq yq

# Linux
apt-get install jq
pip install yq
```

## Architecture

### Local vs Central

- **Local execution**: All skills run on user's Claude Code instance
- **Central definition**: Workflow gates defined in central repository
- **Central storage**: Backend API handles git + database atomically

### Atomic Publishing

The backend API ensures:
1. Clone ideas_central repository
2. Create spec file in `ideas/YYYYMMDD-HHMMSS-slug/spec.md`
3. Git commit and push
4. Insert database record
5. **If any step fails, rollback all changes**

### Extensible Workflow

New stages and gates can be added to `idea-workflow.yaml`:
- Add more validation gates (linting, schema validation, etc.)
- Add stages (review, approval, deployment)
- Customize per team/organization

## Use Cases

### Individual Developer
```bash
# Create idea locally
/expand_idea "Add user authentication with OAuth2"

# Review and edit spec.md manually
# ...

# Publish when ready
/publish_idea ideas/20260423-110000-oauth2-auth/spec.md
```

### Team with Quality Gates
```bash
# Create idea
/expand_idea "Dashboard for analytics"

# Submit for validation
/submit_idea ideas/20260423-120000-analytics-dashboard/spec.md

# Gates check quality, then auto-publish if passed
```

### Bulk Operations
```bash
# Publish multiple specs
for spec in ideas/*/spec.md; do
  ./publish-idea/scripts/publish-idea.sh "$spec"
done
```

## Directory Structure

```
idea-workflow-skills/
├── README.md                    # This file
│
├── expand-idea/                 # Stage 1: Specify
│   ├── skill.md                 # Command documentation
│   ├── config.json              # Backend API config
│   ├── install.sh               # Installation script
│   ├── scripts/
│   │   ├── handler.sh           # Main Q&A and spec generation
│   │   └── skill-wrapper.sh    # Claude Code integration
│   └── templates/
│       ├── spec-template.md     # Specification template
│       └── validation-guidelines.yaml
│
├── publish-idea/                # Manual publish (no validation)
│   ├── skill.md
│   ├── config.json
│   ├── install.sh
│   └── scripts/
│       ├── publish-idea.sh      # API publishing
│       └── publish-idea-wrapper.sh
│
└── submit-idea/                 # Stage 2: Submit (with gates)
    ├── skill.md
    ├── config.json
    ├── install.sh
    ├── scripts/
    │   ├── submit-idea.sh       # Gate validation + publish
    │   └── submit-idea-wrapper.sh
    └── workflows/
        └── idea-workflow.yaml   # Workflow definition

```

## Troubleshooting

### "AUTH_TOKEN not set"
```bash
export AUTH_TOKEN='your-token'
# Or add to ~/.bashrc
echo 'export AUTH_TOKEN="your-token"' >> ~/.bashrc
source ~/.bashrc
```

### "publish_idea skill not found"
```bash
# Install publish-idea first
cd publish-idea && ./install.sh
```

### "Workflow definition not found"
```bash
# Workflow is included in submit-idea/workflows/
# No download needed unless updating from central repo
```

### Gate validation fails
```bash
# Read the error messages - they show specific issues
# Fix the spec.md file and retry
/submit_idea ideas/your-idea/spec.md
```

## Contributing

### Adding New Gates

Edit `submit-idea/workflows/idea-workflow.yaml`:

```yaml
gates:
  - name: my_custom_gate
    type: custom_validation
    description: Check for specific requirements
    checks:
      - name: my_check
        pattern: "## Required Section"
        required: true
        message: "Missing required section"
```

### Adding New Stages

```yaml
stages:
  - name: review
    description: Peer review stage
    commands:
      - review_idea
    gates:
      - name: approval_check
        type: approval
        required_approvals: 2
```

## License

See project root for license information.
