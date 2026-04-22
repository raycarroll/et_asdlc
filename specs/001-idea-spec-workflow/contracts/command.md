# Custom Command Contract

**Command Name**: `/expand_idea`  
**Type**: Claude Code Skill  
**Version**: 1.0

---

## Command Interface

### Invocation

```
/expand_idea <idea-description>
```

**Parameters**:
- `idea-description` (string, required): Natural language description of the idea to validate and expand

**Examples**:
```
/expand_idea Add user authentication with OAuth2 support
/expand_idea Create a dashboard showing real-time analytics
/expand_idea Fix the memory leak in the background worker process
```

---

## Execution Flow

1. **Parse Input**: Extract idea description from command arguments
2. **Create Session**: Generate session ID, initialize conversation state
3. **Check Template Updates**: If last check > 24 hours ago, fetch latest templates from git (non-blocking)
4. **Load Guidelines**: Read validation guidelines from template repository
5. **Interactive Validation**: Present questions to user based on guidelines
6. **Generate Spec**: Use spec template to create specification document
7. **Publish** (optional): Push to git + register in database atomically
8. **Cleanup**: Mark session as completed

---

## User Interaction

### Question Format

```
[Validation Question 1/5]

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

### Follow-up Questions

If response is unclear or incomplete:

```
[Follow-up]

You mentioned "users" but didn't specify which type. Could you clarify?
- Are these external customers using the product?
- Are these internal employees managing the system?

Your answer:
```

### Progress Indicator

```
✓ Completed: Understanding user goals (1/5)
→ In progress: Defining success criteria (2/5)
  Remaining: Edge cases, data model, constraints
```

---

## Output

### Success

```
✅ Specification Generated Successfully

Title: Add User Authentication with OAuth2 Support
Location: ~/.claude/idea-workflow/specs/2026-04-21-oauth2-auth/spec.md

Next steps:
- Review specification: cat ~/.claude/idea-workflow/specs/2026-04-21-oauth2-auth/spec.md
- Publish idea: /publish_idea 2026-04-21-oauth2-auth
- Continue editing: /edit_spec 2026-04-21-oauth2-auth

Session saved. You can resume later with: /resume_idea <session-id>
```

### Pause/Resume

User can interrupt at any time. Session state is saved automatically.

```
⏸️  Session Paused

Session ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Progress: 3/5 questions completed

Resume anytime with: /resume_idea a1b2c3d4-e5f6-7890-abcd-ef1234567890
Auto-cleanup in 7 days if not resumed.
```

### Error Handling

```
❌ Validation Failed

The idea description is too vague. Please provide more details about:
- What problem are you solving?
- Who will use this feature?
- What is the expected outcome?

Try again with more context: /expand_idea <detailed-description>
```

---

## Session State Contract

**Storage Location**: `~/.claude/idea-workflow/sessions/<session-id>.json`

**Format**:
```json
{
  "sessionId": "uuid",
  "userId": "uuid",
  "ideaTitle": "Working title",
  "currentQuestionIndex": 2,
  "responses": {
    "question_1": {
      "question": "Who is the primary user?",
      "answer": "End users (customers)"
    },
    "question_2": {
      "question": "What is the main goal?",
      "answer": "Allow users to sign in with Google/GitHub"
    }
  },
  "partialSpec": "# Specification (in progress)...",
  "status": "active",
  "createdAt": "2026-04-21T14:00:00Z",
  "updatedAt": "2026-04-21T14:15:00Z",
  "expiresAt": "2026-04-28T14:00:00Z"
}
```

**Retention**: 7 days from last update

---

## Template Update Notification

When templates are updated:

```
📦 Template Update Available

The following templates have been updated:
- validation-guidelines/default.yml (v1.2.3 → v1.2.4)
- spec-templates/default.md (v2.0.1 → v2.0.2)

Updates applied automatically. New validations will use the updated templates.

To review changes: /show_template_changes
```

If update fails:

```
⚠️  Template Update Failed

Could not fetch latest templates from repository.
Reason: Network unavailable

Using cached templates from: 2026-04-20T10:00:00Z
Will retry in 24 hours.
```

---

## Configuration

**Configuration File**: `~/.claude/idea-workflow/config.json`

```json
{
  "templateRepository": {
    "url": "https://github.com/org/idea-templates.git",
    "branch": "main",
    "credentials": "credential-helper"
  },
  "database": {
    "connectionString": "postgresql://user:pass@localhost/ideas"
  },
  "api": {
    "baseUrl": "https://ideas.example.com/api/v1",
    "tokenStorage": "~/.claude/idea-workflow/token"
  },
  "sessionRetentionDays": 7,
  "autoPublish": false
}
```

---

## Security

- User authentication token required for publish operations
- Session files stored in user's home directory (OS-level access control)
- Git credentials managed via OS keychain/credential helper
- No sensitive data in session state (user ID only, not email/password)

---

## Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `SESSION_NOT_FOUND` | Resume ID invalid | Start new session |
| `SESSION_EXPIRED` | Session > retention period | Start new session |
| `TEMPLATE_LOAD_ERROR` | Cannot load guidelines | Check network, retry |
| `VALIDATION_ERROR` | Invalid user input | Provide valid response |
| `PUBLISH_FAILED` | Git or DB error | Check credentials, retry |
| `AUTH_REQUIRED` | Token missing/expired | Run `/login` first |

---

## Backward Compatibility

- Session state format versioned (`stateVersion: "1.0"`)
- Old sessions can be resumed if state version is compatible
- Breaking changes require migration or forced fresh start
