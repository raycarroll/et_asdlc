# Test Idea for Idea Workflow System

**Status**: published  
**Created**: 2026-04-22  
**Author**: Ray Carroll

## Overview

This is a test idea created to demonstrate and validate the idea workflow system's publishing mechanism. It serves as a proof-of-concept for the automated spec generation, git integration, and database registration features.

## Problem Statement

Currently, there is no concrete example demonstrating how the `/expand-idea` command would publish ideas to the central GitHub repository. Without a working example, it's difficult to:

- Verify the publishing workflow end-to-end
- Test the template rendering system
- Validate git commit and database integration
- Demonstrate the ideas registry structure to new users

The lack of a test case creates uncertainty about whether the system works as designed.

## Proposed Solution

Create a minimal test idea that exercises the complete publishing workflow:

1. Generate a specification document using the default template
2. Create the proper directory structure (`ideas/YYYYMMDD-HHMMSS-slug/`)
3. Include all required files (spec.md, metadata.json)
4. Commit to GitHub repository
5. Register in PostgreSQL database (simulated for this manual test)

This test idea will serve as:
- A working example for documentation
- A template for future ideas
- Validation of the infrastructure setup

## User Stories

**As a** system administrator  
**I want** to verify the idea publishing workflow works  
**So that** I can confidently enable the feature for users

**As a** developer  
**I want** to see an example published idea  
**So that** I can understand the expected structure and format

**As a** user  
**I want** to test the `/expand-idea` command  
**So that** I can submit my own ideas once the interactive input is implemented

## Requirements

### Functional Requirements

1. **Spec Generation**: Generate a valid specification document with all required sections
2. **Directory Structure**: Create properly named directory with timestamp and slug
3. **Metadata**: Include JSON metadata file with idea details
4. **Git Integration**: Commit spec to GitHub repository in `ideas/` directory
5. **Database Registration**: Register idea in PostgreSQL (future enhancement)

### Non-Functional Requirements

1. **Template Compliance**: Follow the structure defined in `templates/spec-templates/default-spec.md`
2. **Naming Convention**: Use `YYYYMMDD-HHMMSS-slug` format for directory names
3. **Version Control**: Maintain git history for all published ideas
4. **Discoverability**: Ideas browsable via GitHub and searchable via database

## Technical Approach

For this test, the idea is created manually to demonstrate the expected workflow:

```bash
# 1. Create directory
mkdir -p ideas/20260422-160402-test-idea/artifacts

# 2. Generate spec.md from template
# (Filled with test data)

# 3. Create metadata.json
# (Author, timestamps, status)

# 4. Commit to git
git add ideas/20260422-160402-test-idea/
git commit -m "Add test idea to validate publishing workflow"
git push origin main

# 5. Database registration
# (Would be automatic in production via /expand-idea)
```

In production, this entire process would be automated by the `/expand-idea` command after interactive Q&A validation.

## Alternatives Considered

**Alternative 1: Skip manual test, implement interactive input first**
- **Pros**: More authentic test
- **Cons**: Delays validation of infrastructure setup

**Alternative 2: Use mock data in backend tests**
- **Pros**: Faster iteration
- **Cons**: Doesn't test real git integration

**Alternative 3: Use Spec Kit workflow instead**
- **Pros**: Already working
- **Cons**: Different purpose (feature specs vs idea registry)

**Chosen**: Manual test provides immediate validation while interactive input is in development.

## Success Criteria

This test idea is successful if:

1. ✅ Spec.md file is properly formatted and readable
2. ✅ Directory structure matches expected pattern `YYYYMMDD-HHMMSS-slug/`
3. ✅ Metadata.json contains valid JSON with all required fields
4. ✅ Changes committed to GitHub repository successfully
5. ✅ Idea visible in GitHub web interface under `ideas/` directory
6. ⏳ Idea registered in PostgreSQL database (pending interactive input implementation)

**Measurable Outcomes**:
- Idea appears in `ideas/` directory on GitHub
- Git commit includes proper author attribution
- Metadata is machine-readable (valid JSON)
- Template placeholders correctly replaced with actual content

## Open Questions

1. **Interactive Input**: When will the `getUserInput()` function be implemented?
   - **Answer**: After validating this manual test proves the infrastructure works

2. **Database Integration**: Should ideas be auto-registered during git commits via webhook?
   - **Answer**: To be determined based on deployment architecture

3. **Access Control**: Should idea publishing require authentication?
   - **Answer**: Yes - already implemented via JWT authentication in backend

4. **Template Versioning**: How to handle template updates for existing ideas?
   - **Answer**: Git history preserves original; regeneration optional

## References

- GitHub Repository: https://github.com/raycarroll/et_asdlc
- Template Source: `templates/spec-templates/default-spec.md`
- Validation Guidelines: `templates/validation-guidelines/default-questions.yaml`
- Integration Guide: `GITHUB-INTEGRATION.md`

---

*Generated manually to demonstrate Idea Workflow System*  
*In production: Generated by /expand-idea command*
