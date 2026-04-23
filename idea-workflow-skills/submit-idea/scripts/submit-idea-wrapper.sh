#!/bin/bash
# Wrapper for Claude Code to call submit-idea skill
# This allows Claude Code to invoke the skill with /submit_idea command

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get spec file path from arguments
SPEC_FILE="$*"

if [ -z "$SPEC_FILE" ]; then
    echo "Usage: /submit_idea <spec-file-path>"
    echo ""
    echo "This command validates workflow gates and publishes to central repository."
    echo ""
    echo "Examples:"
    echo "  /submit_idea ideas/20260423-110000-my-idea/spec.md"
    echo "  /submit_idea ./ideas/my-idea/spec.md"
    exit 1
fi

# Call the main submit script
exec "${SCRIPT_DIR}/submit-idea.sh" "$SPEC_FILE"
