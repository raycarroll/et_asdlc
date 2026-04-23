# Expand Idea Skill

**Command**: `/expand_idea`

## Description

**Standalone bash skill** for validating ideas through guided prompts and generating structured specifications from templates.

**Features**:
- ✅ **Pure Bash** - No build step, no npm dependencies
- ✅ **Minimal Dependencies** - Only jq, curl, yq/python3
- ✅ **Instant Install** - One command installation
- ✅ **Configurable** - Point to your own central repository
- ✅ **Portable** - Works on any system with bash
- ✅ **Filesystem Sessions** - No database required

## Installation

See [INSTALL.md](./INSTALL.md) for detailed installation instructions.

**Quick Install**:
```bash
./install.sh
```

**Configure**: Edit `config.json` with your backend API URL and set `AUTH_TOKEN` environment variable.

## Usage

```
/expand_idea <idea-description>
```

**Parameters**:
- `idea-description` (required): Natural language description of the idea to validate and expand

**Examples**:
```
/expand_idea Add user authentication with OAuth2 support
/expand_idea Create a dashboard showing real-time analytics
/expand_idea Fix the memory leak in the background worker process
```

## Workflow

1. **Load Questions**: Read validation guidelines from templates
2. **Interactive Validation**: Present questions one at a time
   - Ask follow-up questions when responses are incomplete
   - Track conversation state (save to filesystem)
3. **Generate Spec**: Use spec template to create specification document
4. **Save Local**: Write spec to `ideas/TIMESTAMP-slug/spec.md`
5. **Cleanup**: Mark session as completed

**Note**: This command only creates the spec locally. To publish to the central repository, install the `/publish_idea` skill separately.

## Question Format

Questions are presented one at a time:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question 1/10
Category: problem
Required: true

What problem does this idea solve? Be specific about the pain point.

Your answer: _
```

User types answer and presses Enter.

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Specification generated successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  - Review specification: cat ./ideas/20260423-110000-oauth2-auth/spec.md
  - Edit specification: $EDITOR ./ideas/20260423-110000-oauth2-auth/spec.md
  - Publish to central repository: /publish_idea ./ideas/20260423-110000-oauth2-auth/spec.md
```

## Error Handling

- **Missing Configuration**: Clear error with instructions
- **Template Load Error**: Falls back to basic template
- **Session Errors**: Sessions auto-save, can resume if interrupted

## Configuration

Configuration in `config.json`:

```json
{
  "backendApiUrl": "https://backend-api.example.com/api/v1",
  "templatesRepoUrl": "https://github.com/your-org/ideas_central.git",
  "authToken": "${AUTH_TOKEN}",
  "localIdeasPath": "./ideas"
}
```

Environment variables:
- `AUTH_TOKEN` - API authentication token

## Dependencies

- `bash` 4.0+ (pre-installed)
- `jq` - JSON processor
- `curl` - HTTP client
- `yq` OR `python3` - YAML parser

## Files

- `scripts/handler.sh` - Main bash script
- `scripts/skill-wrapper.sh` - Claude Code wrapper
- `config.json` - Configuration
- `sessions/` - Session storage (filesystem)
- `templates/` - Cached templates

## Related Commands

- `/publish_idea` - Publish a locally created spec to central repository (separate skill, install from publish-idea-skill/)
