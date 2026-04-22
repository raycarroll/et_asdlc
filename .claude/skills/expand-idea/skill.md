# Expand Idea Skill

**Command**: `/expand_idea`

## Description

Validates ideas through guided prompts, generates structured specifications from templates, and optionally publishes them to a central repository.

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

1. **Parse Input**: Extract idea description from command arguments
2. **Create Session**: Generate session ID, initialize conversation state
3. **Check Template Updates**: If last check > 24 hours ago, fetch latest templates from git (non-blocking)
4. **Load Guidelines**: Read validation guidelines from template repository
5. **Interactive Validation**: Present questions to user based on guidelines
   - Ask follow-up questions when responses are incomplete or unclear
   - Track conversation state to allow pause/resume
6. **Generate Spec**: Use spec template to create specification document
7. **Save Specification**: Write generated spec to file
8. **Publish** (optional): Push to git + register in database atomically
9. **Cleanup**: Mark session as completed

## Question Format

Questions are presented one at a time:

```
[Validation Question 1/10]

Context: We need to understand the primary user goal for this feature.

Question: Who is the primary user for this feature?

Suggested answers:
A) End users (customers)
B) Internal team members (admins, support)
C) Developers/integrators (API consumers)
D) Other (please specify)

Your answer:
```

User responds with letter or custom text.

## Pause/Resume

Sessions are automatically saved to filesystem. Users can:
- Resume incomplete sessions: `/resume_idea <session-id>`
- List active sessions: `/list_idea_sessions`

Sessions expire after 7 days of inactivity.

## Output

```
✅ Specification Generated Successfully

Title: Add User Authentication with OAuth2 Support
Location: ~/.claude/idea-workflow/specs/oauth2-auth/spec.md

Next steps:
- Review specification: cat ~/.claude/idea-workflow/specs/oauth2-auth/spec.md
- Publish idea: /publish_idea oauth2-auth
- Continue editing: Edit the spec file directly

Session saved. You can resume later with: /resume_idea <session-id>
```

## Error Handling

- **Validation Failed**: Clear error messages with specific guidance
- **Template Load Error**: Falls back to cached templates, retries later
- **Session Not Found**: Instructions to start new session
- **Publish Failed**: Atomic rollback, retry option with error details

## Configuration

Default configuration from environment variables:
- `TEMPLATES_REPO_URL`: Git repository URL for templates
- `TEMPLATES_REPO_PATH`: Local path for template cache
- `TEMPLATE_UPDATE_INTERVAL_HOURS`: Update check frequency (default: 24)

## Requirements

- Node.js 18+
- Git 2.30+
- Write access to `~/.claude/idea-workflow/` directory
- Network access for template updates (optional)

## Related Commands

- `/resume_idea <session-id>` - Resume a paused validation session
- `/list_idea_sessions` - List active validation sessions
- `/publish_idea <spec-name>` - Publish generated spec to repository
