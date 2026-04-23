# Expand Idea Skill - Development

This directory contains the **source code** for the expand-idea skill. It's part of the et_asdlc project but designed to be distributed as a standalone installable skill.

## Project Structure

```
et_asdlc/                          # Main project
├── backend/                       # Central backend API
├── frontend/                      # Ideas dashboard UI
├── expand-idea-skill/             # ← Skill source code (this directory)
│   ├── lib/                       # Standalone modules
│   ├── templates/                 # Default templates
│   ├── handler.ts                 # Main entry point
│   ├── config.json                # Default configuration
│   └── install.sh                 # User installation script
└── .claude/skills/expand-idea/    # Installed skill (for testing)
```

## Development Workflow

### 1. Make Changes Here

Edit source files in `expand-idea-skill/`:
- `handler.ts` - Main skill logic
- `lib/**/*.ts` - Standalone modules
- `templates/` - Default templates
- `config.json` - Default configuration
- `README.md` - User documentation

### 2. Build

```bash
npm install
npm run build
```

### 3. Test Locally

Copy to your local skills directory for testing:

```bash
# From et_asdlc root
cp -r expand-idea-skill ~/.claude/skills/expand-idea
cd ~/.claude/skills/expand-idea
npm install
npm run build
```

Then test in Claude Code:
```
/expand_idea Test idea description
```

### 4. Update Installed Version

If you want to update the version in `.claude/skills/expand-idea`:

```bash
# From et_asdlc root
rm -rf .claude/skills/expand-idea
cp -r expand-idea-skill .claude/skills/expand-idea
cd .claude/skills/expand-idea
npm install
npm run build
```

## Distribution

When ready to release:

### Option 1: GitHub Release (Recommended)

1. Create a GitHub repository: `expand-idea-skill`
2. Copy this directory to that repository
3. Tag a release
4. Users install via:
   ```bash
   git clone https://github.com/your-org/expand-idea-skill.git ~/.claude/skills/expand-idea
   cd ~/.claude/skills/expand-idea
   ./install.sh
   ```

See [DISTRIBUTION.md](./DISTRIBUTION.md) for detailed instructions.

### Option 2: Part of et_asdlc

Keep the skill bundled with the main project:

Users clone the full project and symlink the skill:
```bash
git clone https://github.com/your-org/et_asdlc.git
ln -s $(pwd)/et_asdlc/expand-idea-skill ~/.claude/skills/expand-idea
cd ~/.claude/skills/expand-idea
./install.sh
```

## Dependencies

The skill is **standalone** with minimal dependencies:
- `yaml` - For parsing validation guidelines
- No backend code dependencies
- No database dependencies
- Fully portable

## Configuration

Default `config.json` points to your central backend:
```json
{
  "backendApiUrl": "https://backend-idea-workflow.apps.rosa.catoconn-ray-et.bo0z.p3.openshiftapps.com/api/v1",
  "templatesRepoUrl": "https://github.com/raycarroll/ideas_central.git",
  "authToken": "${AUTH_TOKEN}"
}
```

Users customize this after installation.

## Git Tracking

This directory is tracked in the main `et_asdlc` repository:
- Source code changes committed to et_asdlc
- Users install from standalone distribution (GitHub release or npm)
- `.claude/skills/expand-idea` is gitignored (user installation)

## Files

- **Source code**: `expand-idea-skill/` (this directory)
- **Installed version**: `.claude/skills/expand-idea/` (gitignored)
- **Templates source**: `templates/` (committed)
- **Templates central**: `ideas_central` repository (separate)

## Releasing

When you make changes:

1. Update version in `package.json`
2. Commit to et_asdlc repository
3. (Optional) Push to standalone skill repository
4. (Optional) Create GitHub release
5. Users pull latest changes

## See Also

- [README.md](./README.md) - User documentation
- [INSTALL.md](./INSTALL.md) - Installation guide for users
- [DISTRIBUTION.md](./DISTRIBUTION.md) - Distribution options for maintainers
