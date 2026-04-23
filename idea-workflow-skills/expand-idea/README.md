# Expand Idea Skill - Bash Implementation

A portable Claude Code skill for validating and publishing ideas to a central repository.

## Features

- ✅ **Pure Bash**: No build step, no npm dependencies  
- ✅ **Minimal Dependencies**: Only bash, jq, curl, yq/python3
- ✅ **Instant Install**: `./install.sh` and you're done
- ✅ **Configurable**: Point to your own central repository
- ✅ **Portable**: Works on any system with bash
- ✅ **Self-contained**: Filesystem-based session storage

## Quick Start

### Install via Master Installer (Recommended)

```bash
# Install all idea workflow skills (expand, publish, submit)
curl -fsSL https://raw.githubusercontent.com/raycarroll/et_asdlc/main/idea-workflow-skills/install.sh | bash

# Or install only expand-idea
curl -fsSL https://raw.githubusercontent.com/raycarroll/et_asdlc/main/idea-workflow-skills/install.sh | bash -s -- --expand-only

# Configure
export AUTH_TOKEN="your-api-token"

# Use via Claude Code
/expand_idea "Build an order tracking website"
```

### Manual Installation

```bash
# Install dependencies (macOS)
brew install jq yq

# Clone and install
git clone https://github.com/raycarroll/et_asdlc.git
cd et_asdlc/idea-workflow-skills
./install.sh --expand-only

# Or from local source
./install.sh --target-dir ~/.claude/skills/my-ideas --expand-only
```

**Default installation location**: `~/.claude/skills/expand-idea/`

See [INSTALL.md](./INSTALL.md) for detailed installation instructions.

## Dependencies

- `bash` 4.0+ (pre-installed on most systems)
- `jq` - JSON processor
- `curl` - HTTP client
- `yq` OR `python3` - YAML parser

## License

MIT
