#!/bin/bash
# Wrapper for Claude Code to call publish-idea skill
# This allows Claude Code to invoke the skill with /publish_idea command

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get spec file path from arguments
SPEC_FILE="$*"

if [ -z "$SPEC_FILE" ]; then
    echo "Usage: /publish_idea <spec-file-path>"
    echo ""
    echo "Examples:"
    echo "  /publish_idea ideas/20260423-110000-my-idea/spec.md"
    echo "  /publish_idea ./ideas/my-idea/spec.md"
    exit 1
fi

# Call the main publish script
exec "${SCRIPT_DIR}/publish-idea.sh" "$SPEC_FILE"
