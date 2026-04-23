# Submit Idea Skill

**Command**: `/submit_idea`

## Description

Validates workflow gates and submits idea to central repository.

This skill implements the **submit** stage of the idea workflow:
1. Validates required artifacts exist (spec.md)
2. Validates spec content has required sections
3. If gates pass, automatically invokes `/publish_idea`
4. If gates fail, reports what's missing

## Usage

```
/submit_idea <spec-file-path>
```

**Parameters**:
- `spec-file-path` (required): Path to the spec.md file to validate and submit

**Examples**:
```
/submit_idea ideas/20260423-110000-my-idea/spec.md
/submit_idea ./ideas/order-tracking/spec.md
```

## Workflow Stages

This skill implements **Stage 2: Submit** of the idea workflow:

```
Stage 1: Specify (/expand_idea)
  └─> Create spec locally

Stage 2: Submit (/submit_idea)  ← This skill
  ├─> Gate 1: Artifact Check
  │   └─> spec.md exists, minimum size
  ├─> Gate 2: Content Validation
  │   ├─> Has title
  │   ├─> Has Problem Statement section
  │   ├─> Has Proposed Solution section
  │   └─> Has Success Criteria (warning)
  └─> If gates pass → /publish_idea
```

## Gates

### Gate 1: Artifact Check

Validates required files exist:
- ✓ spec.md exists
- ✓ spec.md is at least 100 bytes

**On Fail**: Blocks submission

### Gate 2: Content Validation

Validates spec.md structure:
- ✓ Has title (# heading)
- ✓ Has "## Problem Statement" section
- ✓ Has "## Proposed Solution" section
- ⚠ Has "## Success Criteria" section (warning only)

**On Fail**: Blocks submission

## Output

**Success** (gates pass):
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
[gate] ✓ Has Success Criteria section
✅ Gate passed: content_validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All gates passed ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[submit-idea] Invoking publish_idea skill...

[publish-idea] Published to central repository
Idea ID: abc-123
Git Path: ideas/20260423-110000-my-idea/spec.md
Commit SHA: def456
```

**Failure** (gates fail):
```
[gate] Running gate: artifact_check
[gate] ✓ spec.md exists
[gate] ✓ spec.md size OK (2456 bytes)
✅ Gate passed: artifact_check

[gate] Running gate: content_validation
[gate] ✓ Has title
[gate] ❌ Missing 'Problem Statement' section
[gate] ✓ Has Proposed Solution section
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

## Workflow Definition

The workflow is defined in `workflows/idea-workflow.yaml` (downloaded from central repository).

Users can customize gates locally or use the central definition.

To update workflow:
```bash
curl -o workflows/idea-workflow.yaml https://raw.githubusercontent.com/your-org/ideas_central/main/workflows/idea-workflow.yaml
```

## Dependencies

- `bash` 4.0+
- `yq` OR `python3` - YAML parser
- `/publish_idea` skill - Must be installed

## Configuration

`config.json`:
```json
{
  "workflowDefinition": "./workflows/idea-workflow.yaml",
  "publishSkillPath": "../publish-idea-skill/scripts/publish-idea.sh"
}
```

## Files

- `scripts/submit-idea.sh` - Main bash script
- `scripts/submit-idea-wrapper.sh` - Claude Code wrapper
- `workflows/idea-workflow.yaml` - Workflow definition
- `config.json` - Configuration

## Error Handling

- **Missing spec.md**: Clear error with file path
- **Invalid spec.md**: Lists missing sections
- **publish_idea not installed**: Instructions to install
- **Workflow definition missing**: Instructions to download

## Use Cases

1. **Standard submit**: Validate and publish in one command
2. **Quality gates**: Ensures specs meet minimum requirements
3. **Workflow enforcement**: Central team defines gates
4. **Local validation**: Check before publishing

## Related Commands

- `/expand_idea` - Create spec locally (Stage 1: Specify)
- `/publish_idea` - Publish without validation (invoked automatically if gates pass)

## Workflow Concept

This skill introduces **workflow orchestration** to the idea management process:

- **Centrally Defined**: Workflow defined in central repo
- **Locally Executed**: Gates run on user's Claude Code instance
- **Extensible**: Add more stages and gates as needed
- **Configurable**: Teams can customize validation rules
