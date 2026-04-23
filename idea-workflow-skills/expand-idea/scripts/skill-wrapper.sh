#!/bin/bash
# Wrapper for Claude Code to call expand-idea skill
# This allows Claude Code to invoke the skill with /expand_idea command

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get idea description from arguments
IDEA_DESCRIPTION="$*"

if [ -z "$IDEA_DESCRIPTION" ]; then
    echo "Usage: /expand_idea <idea-description>"
    exit 1
fi

# Call the main handler
exec "${SCRIPT_DIR}/handler.sh" "$IDEA_DESCRIPTION"
