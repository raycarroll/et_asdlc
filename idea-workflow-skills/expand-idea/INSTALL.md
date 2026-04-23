# Installation Guide - Expand Idea Skill

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org))
- Claude Code installed
- Access to your central ideas backend API
- Authentication token for the API

## Installation Methods

### Method 1: Install from GitHub (Recommended)

**For user-wide installation** (available in all projects):

```bash
# Clone into user skills directory
git clone https://github.com/your-org/expand-idea-skill.git ~/.claude/skills/expand-idea

# Navigate to skill directory
cd ~/.claude/skills/expand-idea

# Run installer
./install.sh
```

**For project-specific installation** (only available in this project):

```bash
# Clone into project skills directory
git clone https://github.com/your-org/expand-idea-skill.git ./.claude/skills/expand-idea

# Navigate to skill directory
cd ./.claude/skills/expand-idea

# Run installer
./install.sh
```

### Method 2: Manual Installation

1. **Download the skill**

   Download and extract the skill archive or clone the repository:
   
   ```bash
   curl -L https://github.com/your-org/expand-idea-skill/archive/main.zip -o expand-idea.zip
   unzip expand-idea.zip
   ```

2. **Copy to Claude Code skills directory**

   ```bash
   # User-wide
   mkdir -p ~/.claude/skills
   cp -r expand-idea-skill-main ~/.claude/skills/expand-idea
   
   # OR project-specific
   mkdir -p .claude/skills
   cp -r expand-idea-skill-main ./.claude/skills/expand-idea
   ```

3. **Install dependencies**

   ```bash
   cd ~/.claude/skills/expand-idea  # or ./.claude/skills/expand-idea
   npm install
   npm run build
   ```

### Method 3: Direct Clone (Development)

For contributing or customizing:

```bash
git clone https://github.com/your-org/expand-idea-skill.git
cd expand-idea-skill
npm install
npm run build

# Then symlink to Claude Code
ln -s $(pwd) ~/.claude/skills/expand-idea
```

## Configuration

### 1. Edit config.json

Edit `config.json` in the skill directory:

```json
{
  "backendApiUrl": "https://your-backend.example.com/api/v1",
  "templatesRepoUrl": "https://github.com/your-org/ideas_central.git",
  "authToken": "${AUTH_TOKEN}",
  "localIdeasPath": "./ideas",
  "sessionStoragePath": ".claude/skills/expand-idea/sessions",
  "templateCachePath": ".claude/skills/expand-idea/templates"
}
```

**Required fields:**
- `backendApiUrl`: Your central ideas backend API URL
- `templatesRepoUrl`: Git repository containing validation templates
- `authToken`: Use `${AUTH_TOKEN}` to read from environment variable

**Optional fields:**
- `localIdeasPath`: Where to save ideas locally (default: `./ideas`)
- `sessionStoragePath`: Session storage location (default: `.claude/skills/expand-idea/sessions`)
- `templateCachePath`: Template cache location (default: `.claude/skills/expand-idea/templates`)

### 2. Set Authentication Token

**Option A: Environment Variable** (recommended)

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export AUTH_TOKEN="your-api-token-here"
```

Then reload:
```bash
source ~/.bashrc  # or ~/.zshrc
```

**Option B: Direct in config.json** (not recommended for security)

Replace `${AUTH_TOKEN}` with your actual token:

```json
{
  "authToken": "your-actual-token-here"
}
```

⚠️ **Security Warning**: Don't commit config.json with real tokens to git!

### 3. Download Templates

Clone the templates repository to the cache location:

```bash
cd ~/.claude/skills/expand-idea  # or ./.claude/skills/expand-idea

git clone https://github.com/your-org/ideas_central.git ./templates
```

Or if you have a different templates location:

```bash
git clone <your-templates-repo-url> ./templates
```

## Verification

### Test the Installation

1. **Check skill is recognized**

   Open Claude Code and type `/expand_idea` - it should show up in autocomplete

2. **Test with a simple idea**

   ```
   /expand_idea Test idea for installation verification
   ```

   You should see:
   - Validation questions appear
   - Local spec file created in `ideas/` directory
   - (Optional) Published to central repository if API is configured

3. **Check logs for errors**

   If anything fails, check the output for error messages about:
   - Missing configuration
   - Authentication failures
   - Template loading issues

## Troubleshooting

### "Command not found: /expand_idea"

**Cause**: Skill not in recognized skills directory

**Fix**:
```bash
# Verify skill location
ls ~/.claude/skills/expand-idea/skill.md
# or
ls ./.claude/skills/expand-idea/skill.md

# If missing, reinstall to correct location
```

### "Failed to load configuration"

**Cause**: `config.json` missing or invalid JSON

**Fix**:
```bash
cd ~/.claude/skills/expand-idea
cat config.json  # Check for syntax errors
# Ensure it's valid JSON (use jsonlint or online validator)
```

### "Failed to publish to central repository"

**Cause**: Backend API not accessible or authentication failed

**Fix**:
```bash
# Test API connectivity
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  https://your-backend.example.com/api/v1/health

# Verify AUTH_TOKEN is set
echo $AUTH_TOKEN

# Check config.json has correct backendApiUrl
```

### "Failed to load validation guideline"

**Cause**: Templates not downloaded or in wrong location

**Fix**:
```bash
cd ~/.claude/skills/expand-idea

# Check templates exist
ls templates/validation-guidelines/default-questions.yaml

# If missing, download templates
git clone https://github.com/your-org/ideas_central.git ./templates
```

### TypeScript Build Errors

**Cause**: Node.js version too old or dependencies not installed

**Fix**:
```bash
# Check Node.js version (must be 18+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Updating the Skill

### Pull Latest Changes

```bash
cd ~/.claude/skills/expand-idea
git pull origin main
npm install  # Update dependencies if package.json changed
npm run build
```

### Update Templates

```bash
cd ~/.claude/skills/expand-idea/templates
git pull origin main
```

## Uninstallation

```bash
# User-wide
rm -rf ~/.claude/skills/expand-idea

# Project-specific
rm -rf ./.claude/skills/expand-idea
```

## Getting Help

- **Documentation**: [README.md](./README.md)
- **Issues**: https://github.com/your-org/expand-idea-skill/issues
- **API Documentation**: https://your-backend.example.com/api/docs

## Next Steps

After installation:

1. ✅ Configuration complete
2. ✅ Templates downloaded
3. ✅ Authentication set up

**Start using the skill:**

```
/expand_idea Your first idea description
```

The skill will:
1. Guide you through validation questions
2. Generate a specification
3. Save it locally to `ideas/YYYYMMDD-HHMMSS-slug/spec.md`
4. Publish to your central repository
5. Register in the database

**Happy idea validating!** 🎯
