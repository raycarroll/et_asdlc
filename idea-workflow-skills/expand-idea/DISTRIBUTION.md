# Distribution Guide

This guide is for **maintainers** who want to publish the expand-idea skill for others to use.

## Option 1: GitHub Repository (Recommended)

### 1. Create a Standalone Repository

Create a new GitHub repository for the skill:

```bash
# In your et_asdlc project
cd .claude/skills/expand-idea

# Initialize as standalone repo
git init
git add .
git commit -m "Initial release of expand-idea skill"

# Create repository on GitHub: https://github.com/your-org/expand-idea-skill

# Push to GitHub
git remote add origin https://github.com/your-org/expand-idea-skill.git
git branch -M main
git push -u origin main
```

### 2. Update Repository URLs

In your documentation, replace `your-org` with your actual GitHub organization:

- `README.md`
- `INSTALL.md`
- `skill.md`

### 3. Create a Release

```bash
# Tag a version
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

Create a GitHub Release with installation instructions.

### 4. User Installation (from GitHub)

Users install with:

```bash
# User-wide installation
git clone https://github.com/your-org/expand-idea-skill.git ~/.claude/skills/expand-idea
cd ~/.claude/skills/expand-idea
./install.sh
```

## Option 2: NPM Package

### 1. Prepare for NPM

Update `package.json`:

```json
{
  "name": "@your-org/expand-idea-skill",
  "version": "1.0.0",
  "description": "Standalone Claude Code skill for idea validation",
  "main": "dist/handler.js",
  "bin": {
    "expand-idea-install": "scripts/install-skill.js"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/expand-idea-skill"
  },
  "files": [
    "dist/",
    "lib/",
    "templates/",
    "config.json",
    "skill.md",
    "README.md",
    "INSTALL.md"
  ]
}
```

### 2. Create Installation Script

```bash
# scripts/install-skill.js
#!/usr/bin/env node

const { execSync } = require('child_process');
const { copyFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

const skillsDir = join(homedir(), '.claude', 'skills', 'expand-idea');

console.log('Installing expand-idea skill to:', skillsDir);

mkdirSync(skillsDir, { recursive: true });

// Copy files
const filesToCopy = ['config.json', 'skill.md', 'README.md', 'INSTALL.md'];
filesToCopy.forEach(file => {
  copyFileSync(join(__dirname, '..', file), join(skillsDir, file));
});

// Copy directories
execSync(`cp -r ${join(__dirname, '..', 'dist')} ${skillsDir}/`);
execSync(`cp -r ${join(__dirname, '..', 'lib')} ${skillsDir}/`);
execSync(`cp -r ${join(__dirname, '..', 'templates')} ${skillsDir}/`);

console.log('✅ Skill installed successfully!');
console.log('Next steps:');
console.log('1. Edit config.json:', join(skillsDir, 'config.json'));
console.log('2. Set AUTH_TOKEN environment variable');
console.log('3. Use: /expand_idea <idea-description>');
```

### 3. Publish to NPM

```bash
# Login to NPM
npm login

# Publish
npm publish --access public
```

### 4. User Installation (from NPM)

Users install with:

```bash
# Install globally
npm install -g @your-org/expand-idea-skill

# Run installer
expand-idea-install
```

## Option 3: Direct Download

### 1. Create Release Archive

```bash
# Build the skill
npm run build

# Create archive
cd ..
tar -czf expand-idea-skill-v1.0.0.tar.gz expand-idea/ \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=sessions

# Or create zip
zip -r expand-idea-skill-v1.0.0.zip expand-idea/ \
  -x "*/node_modules/*" "*/.git/*" "*/dist/*" "*/sessions/*"
```

### 2. Host Archive

Upload to GitHub Releases or your own server.

### 3. User Installation (from archive)

Users install with:

```bash
# Download
curl -L https://github.com/your-org/expand-idea-skill/releases/download/v1.0.0/expand-idea-skill-v1.0.0.tar.gz -o expand-idea.tar.gz

# Extract
tar -xzf expand-idea.tar.gz

# Copy to skills directory
cp -r expand-idea ~/.claude/skills/expand-idea

# Install
cd ~/.claude/skills/expand-idea
./install.sh
```

## Option 4: Claude Code Marketplace (Future)

If/when Claude Code has an official skill marketplace, you can submit this skill there.

## Recommended Distribution Flow

**For most users, use GitHub + GitHub Releases:**

1. ✅ Create GitHub repository
2. ✅ Tag releases (v1.0.0, v1.1.0, etc.)
3. ✅ Include INSTALL.md in repository
4. ✅ Create GitHub Releases with installation instructions
5. ✅ Users clone or download releases

**Installation Command (one-liner):**

```bash
git clone https://github.com/your-org/expand-idea-skill.git ~/.claude/skills/expand-idea && cd ~/.claude/skills/expand-idea && ./install.sh
```

## Maintenance

### Versioning

Use semantic versioning:
- **1.0.0**: Initial release
- **1.0.1**: Bug fixes
- **1.1.0**: New features (backward compatible)
- **2.0.0**: Breaking changes

### Changelog

Maintain a `CHANGELOG.md`:

```markdown
# Changelog

## [1.0.0] - 2026-04-23
### Added
- Initial release
- Validation question workflow
- API-based publishing
- Filesystem session storage
- Standalone configuration
```

### Updates

When you release a new version:

```bash
# Update version in package.json
npm version patch  # or minor, major

# Commit and tag
git add .
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin main --tags

# Create GitHub Release
```

Users update with:

```bash
cd ~/.claude/skills/expand-idea
git pull origin main
npm install
npm run build
```

## Support

Provide support channels:
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Documentation in README.md
- Examples in INSTALL.md
