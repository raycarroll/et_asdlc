# Submit Idea Skill

Validates workflow gates and submits ideas to the central repository with automatic publishing.

## Features

- ✅ **Workflow Gates**: Validates artifacts and content before publishing
- ✅ **Automatic Publishing**: Invokes publish_idea if all gates pass
- ✅ **Pure Bash**: No build step, minimal dependencies
- ✅ **Configurable**: YAML-defined workflow gates
- ✅ **Quality Assurance**: Ensures specs meet minimum requirements

## Quick Start

### Install via Master Installer (Recommended)

```bash
# Install all idea workflow skills
curl -fsSL https://raw.githubusercontent.com/raycarroll/et_asdlc/main/idea-workflow-skills/install.sh | bash

# Or install only submit-idea
curl -fsSL https://raw.githubusercontent.com/raycarroll/et_asdlc/main/idea-workflow-skills/install.sh | bash -s -- --submit-only

# Configure
export AUTH_TOKEN="your-api-token"

# Use via Claude Code
/submit_idea ideas/20260423-110000-my-idea/spec.md
```

### Manual Installation

```bash
# Clone and install
git clone https://github.com/raycarroll/et_asdlc.git
cd et_asdlc/idea-workflow-skills
./install.sh --submit-only
```

**Default installation location**: `~/.claude/skills/idea-workflow/submit-idea/`

## What It Does

**Stage 2: Submit** - Validates and publishes ideas

1. **Gate 1: Artifact Check**
   - Validates spec.md exists
   - Checks minimum file size (100 bytes)

2. **Gate 2: Content Validation**
   - Verifies title (# heading)
   - Checks for Problem Statement section
   - Checks for Proposed Solution section
   - Warns if Success Criteria missing (non-blocking)

3. **Auto-Publish**
   - If all gates pass, automatically invokes `/publish_idea`
   - Backend handles atomic git push + database insert

## Workflow Gates

Gates are defined in `workflows/idea-workflow.yaml`:

```yaml
gates:
  - name: artifact_check
    type: required_files
    artifacts:
      - name: spec.md
        required: true
        min_size: 100

  - name: content_validation
    type: spec_validation
    checks:
      - pattern: "^# "
        required: true
      - pattern: "## Problem Statement"
        required: true
      - pattern: "## Proposed Solution"
        required: true
```

## Dependencies

- `bash` 4.0+
- `jq` - JSON processor
- `curl` - HTTP client
- `yq` OR `python3` - YAML parser
- `publish_idea` skill (installed automatically with master installer)

## Configuration

**config.json**:
```json
{
  "workflowDefinition": "./workflows/idea-workflow.yaml",
  "publishSkillPath": "../publish-idea/scripts/publish-idea.sh"
}
```

**Environment variables**:
```bash
export AUTH_TOKEN="your-api-token"
```

## Output

### Success (gates pass)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running Submit Stage Gates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[gate] Running gate: artifact_check
[gate] ✓ spec.md exists
[gate] ✓ spec.md size OK (2456 bytes)
✅ Gate passed: artifact_check

[gate] Running gate: content_validation
[gate] ✓ Has title
[gate] ✓ Has Problem Statement section
[gate] ✓ Has Proposed Solution section
✅ Gate passed: content_validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All gates passed ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[submit-idea] Invoking publish_idea skill...

✅ Published to central repository
Idea ID: abc-123
Git Path: ideas/20260423-110000-my-idea/spec.md
```

### Failure (gates fail)

```
[gate] Running gate: content_validation
[gate] ✓ Has title
[gate] ❌ Missing 'Problem Statement' section
❌ Gate failed: content_validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Gate validation failed ✗
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Submit failed - fix validation errors and try again

Next steps:
  1. Fix the validation errors listed above
  2. Edit your spec: $EDITOR ideas/20260423-110000-my-idea/spec.md
  3. Retry: /submit_idea ideas/20260423-110000-my-idea/spec.md
```

## Use Cases

1. **Standard Workflow**: Validate and publish in one command
2. **Quality Gates**: Ensures specs meet minimum requirements before publishing
3. **Workflow Enforcement**: Central team defines validation rules
4. **Local Validation**: Check spec quality before submitting

## Workflow Concept

This skill introduces **workflow orchestration** to idea management:

- **Centrally Defined**: Workflow gates defined in central repository
- **Locally Executed**: Gates run on user's Claude Code instance
- **Extensible**: Add more stages and gates as needed
- **Configurable**: Teams can customize validation rules

## Updating Workflow Definition

Download the latest workflow from central repository:

```bash
curl -o ~/.claude/skills/idea-workflow/submit-idea/workflows/idea-workflow.yaml \
  https://raw.githubusercontent.com/raycarroll/ideas_central/main/workflows/idea-workflow.yaml
```

## Related Skills

- `/expand_idea` - Create spec locally (Stage 1: Specify)
- `/publish_idea` - Manual publish without validation (invoked automatically by submit_idea)

## License

MIT
