# Publish Idea Skill

**Command**: `/publish_idea`

## Description

Manually publish a locally created specification to the central ideas repository.

This skill takes an existing spec file and:
1. Reads the specification content
2. Extracts metadata (title, summary, goals, requirements)
3. POSTs to the backend API
4. Backend handles git push to ideas_central
5. Backend registers in database

## Usage

```
/publish_idea <spec-file-path>
```

**Parameters**:
- `spec-file-path` (required): Path to the spec.md file to publish

**Examples**:
```
/publish_idea ideas/20260423-110000-my-idea/spec.md
/publish_idea ./ideas/my-idea/spec.md
```

## Workflow

1. **Load Configuration**: Read backend API URL and auth token
2. **Read Spec**: Load spec.md file from provided path
3. **Extract Metadata**: Parse title and metadata from spec content
4. **Publish via API**: POST to `/api/v1/ideas` endpoint
5. **Display Result**: Show idea ID, git path, commit SHA

## Output

**Success**:
```
[publish-idea] Reading specification from: ideas/20260423-110000-my-idea/spec.md
[publish-idea] Title: My Idea Title
[publish-idea] Publishing to central repository...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Published to central repository
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[publish-idea] Idea ID: 550e8400-e29b-41d4-a716-446655440000
[publish-idea] Git Path: ideas/20260423-110000-my-idea/spec.md
[publish-idea] Commit SHA: abc123def456

[publish-idea] Your idea is now available in the central repository!
```

**Failure**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Failed to publish to central repository
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[publish-idea] HTTP 401: Unauthorized

Troubleshooting:
  - Check AUTH_TOKEN is set: echo $AUTH_TOKEN
  - Verify backend API is accessible
  - Review spec file for issues
```

## Error Handling

- **Missing spec file**: Clear error message with usage instructions
- **Missing AUTH_TOKEN**: Prompts user to set environment variable
- **API failure**: Shows HTTP status and error message
- **Network issues**: Displays connection error

## Configuration

Uses same `config.json` as `/expand_idea`:

```json
{
  "backendApiUrl": "https://backend-api.example.com/api/v1",
  "authToken": "${AUTH_TOKEN}"
}
```

Environment variables:
- `AUTH_TOKEN` - API authentication token (required)

## Dependencies

- `bash` 4.0+
- `jq` - JSON processor
- `curl` - HTTP client

## Use Cases

1. **Manual publish after editing**: Edit spec locally, then publish when ready
2. **Retry failed publish**: If `/expand_idea` publish failed, retry manually
3. **Re-publish with updates**: Update spec, publish again with changes
4. **Bulk publish**: Script to publish multiple specs at once

## Files

- `scripts/publish-idea.sh` - Main bash script
- `scripts/publish-idea-wrapper.sh` - Claude Code wrapper
- Shares `config.json` with `/expand_idea`

## Related Commands

- `/expand_idea` - Create and validate new idea specification
- Both commands work together: expand creates spec locally, publish pushes to central repo
