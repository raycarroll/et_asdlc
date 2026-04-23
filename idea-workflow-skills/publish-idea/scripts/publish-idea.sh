#!/bin/bash
# Publish Idea to Central Repository
# Manually publish a locally created specification to the central ideas repository

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Configuration
CONFIG_FILE="${SKILL_DIR}/config.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[publish-idea]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[publish-idea]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[publish-idea]${NC} $1"
}

log_error() {
    echo -e "${RED}[publish-idea]${NC} $1" >&2
}

# Check dependencies
check_dependencies() {
    local missing=0

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        log_error "Install: brew install jq  (macOS) or  apt-get install jq  (Linux)"
        missing=1
    fi

    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

# Load configuration
load_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi

    # Read config with environment variable substitution
    BACKEND_API_URL=$(jq -r '.backendApiUrl' "$CONFIG_FILE" | envsubst)
    AUTH_TOKEN=$(jq -r '.authToken' "$CONFIG_FILE" | envsubst)

    if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" = "null" ]; then
        log_error "AUTH_TOKEN not set"
        log_error "Set it with: export AUTH_TOKEN='your-token'"
        exit 1
    fi

    log_info "Configuration loaded"
    log_info "Backend API: $BACKEND_API_URL"
}

# Extract title from spec markdown
extract_title() {
    local spec_file="$1"

    # Get first # heading
    local title=$(grep -m 1 '^# ' "$spec_file" | sed 's/^# //')

    if [ -z "$title" ]; then
        # Fallback to directory name
        title=$(basename "$(dirname "$spec_file")")
    fi

    echo "$title"
}

# Extract metadata from spec content
extract_metadata() {
    local spec_content="$1"

    # Extract summary (first paragraph after title)
    local summary=$(echo "$spec_content" | awk '/^# /{flag=1; next} flag && /^[^#]/ && NF {print; exit}')

    # Extract goals from Success Criteria section
    local goals=$(echo "$spec_content" | awk '/^## Success Criteria/,/^##/ {if (/^- /) print}' | sed 's/^- //' | jq -R -s 'split("\n") | map(select(length > 0))')

    # Extract requirements from Functional Requirements section
    local requirements=$(echo "$spec_content" | awk '/^## Functional Requirements/,/^##/ {if (/^- /) print}' | sed 's/^- //' | jq -R -s 'split("\n") | map(select(length > 0))')

    cat <<EOF
{
  "summary": $(echo "$summary" | jq -R -s .),
  "goals": $goals,
  "requirements": $requirements,
  "tags": []
}
EOF
}

# Publish to central repository via API
publish_to_api() {
    local spec_file="$1"

    if [ ! -f "$spec_file" ]; then
        log_error "Specification file not found: $spec_file"
        exit 1
    fi

    log_info "Reading specification from: $spec_file"

    # Read spec content
    local spec_content=$(cat "$spec_file")

    # Extract title
    local title=$(extract_title "$spec_file")
    log_info "Title: $title"

    # Extract metadata
    local metadata=$(extract_metadata "$spec_content")

    # Build API payload
    local payload=$(cat <<EOF
{
  "title": $(echo "$title" | jq -R -s .),
  "specContent": $(echo "$spec_content" | jq -R -s .),
  "metadata": $metadata
}
EOF
)

    log_info "Publishing to central repository..."

    # Make API call
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "$payload" \
        "$BACKEND_API_URL/ideas" 2>&1)

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        local idea_id=$(echo "$body" | jq -r '.ideaId')
        local git_path=$(echo "$body" | jq -r '.gitPath')
        local commit_sha=$(echo "$body" | jq -r '.commitSha')

        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_success "Published to central repository"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        log_info "Idea ID: $idea_id"
        log_info "Git Path: $git_path"
        log_info "Commit SHA: $commit_sha"
        echo ""
        log_info "Your idea is now available in the central repository!"
        echo ""

        return 0
    else
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_error "Failed to publish to central repository"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        log_error "HTTP $http_code: $(echo "$body" | jq -r '.message // .error // "Unknown error"')"
        echo ""
        log_info "Troubleshooting:"
        log_info "  - Check AUTH_TOKEN is set: echo \$AUTH_TOKEN"
        log_info "  - Verify backend API is accessible"
        log_info "  - Review spec file for issues"
        echo ""

        return 1
    fi
}

# Main function
main() {
    local spec_file="${1:-}"

    if [ -z "$spec_file" ]; then
        log_error "Usage: $0 <spec-file-path>"
        log_error ""
        log_error "Examples:"
        log_error "  $0 ideas/20260423-110000-my-idea/spec.md"
        log_error "  $0 ./ideas/my-idea/spec.md"
        exit 1
    fi

    # Check dependencies
    check_dependencies

    # Load configuration
    load_config

    # Publish to API
    publish_to_api "$spec_file"
}

# Run main function
main "$@"
