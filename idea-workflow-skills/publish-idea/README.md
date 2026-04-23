# Publish Idea Skill

Manually publish a locally created specification to the central ideas repository.

## Features

- ✅ **Pure Bash**: No build step, no dependencies
- ✅ **Simple**: One command to publish
- ✅ **Configurable**: Point to your backend API
- ✅ **Portable**: Works on any system with bash

## Quick Start

### Install via Master Installer (Recommended)

```bash
# Install all idea workflow skills
curl -fsSL https://raw.githubusercontent.com/raycarroll/et_asdlc/main/idea-workflow-skills/install.sh | bash

# Or install only publish-idea
curl -fsSL https://raw.githubusercontent.com/raycarroll/et_asdlc/main/idea-workflow-skills/install.sh | bash -s -- --publish-only

# Configure
export AUTH_TOKEN="your-api-token"

# Use via Claude Code
/publish_idea ideas/20260423-110000-my-idea/spec.md
```

### Manual Installation

```bash
# Clone and install
git clone https://github.com/raycarroll/et_asdlc.git
cd et_asdlc/idea-workflow-skills
./install.sh --publish-only
```

**Default installation location**: `~/.claude/skills/idea-workflow/publish-idea/`

## What It Does

1. Reads the spec.md file
2. Extracts title and metadata
3. POSTs to backend API
4. Backend pushes to ideas_central git repo
5. Backend registers in database
6. Returns idea ID, git path, and commit SHA

## Dependencies

- `bash` 4.0+
- `jq` - JSON processor
- `curl` - HTTP client

## Configuration

Edit `config.json`:

```json
{
  "backendApiUrl": "https://your-backend.example.com/api/v1",
  "authToken": "${AUTH_TOKEN}"
}
```

Set environment variable:
```bash
export AUTH_TOKEN="your-token"
```

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Published to central repository
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Idea ID: 550e8400-e29b-41d4-a716-446655440000
Git Path: ideas/20260423-110000-my-idea/spec.md
Commit SHA: abc123def456

Your idea is now available in the central repository!
```

## Use Cases

- Publish after creating spec with `/expand_idea`
- Retry failed publishes
- Re-publish after editing specs locally
- Bulk publish multiple specs

## Related Skills

- `/expand_idea` - Create and validate idea specifications locally

## License

MIT
