#!/bin/bash
# Expand Idea Skill - Bash Implementation
# Standalone skill for validating and publishing ideas

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Configuration
CONFIG_FILE="${SKILL_DIR}/config.json"
TEMPLATES_DIR="${SKILL_DIR}/templates"
SESSIONS_DIR="${SKILL_DIR}/sessions"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[expand-idea]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[expand-idea]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[expand-idea]${NC} $1"
}

log_error() {
    echo -e "${RED}[expand-idea]${NC} $1" >&2
}

# Check dependencies
check_dependencies() {
    local missing=0

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        log_error "Install: brew install jq  (macOS) or  apt-get install jq  (Linux)"
        missing=1
    fi

    # Check for YAML parser (yq or python)
    if ! command -v yq &> /dev/null && ! command -v python3 &> /dev/null; then
        log_error "Either yq or python3 is required for YAML parsing"
        log_error "Install: brew install yq  (macOS) or  pip install yq  (Python)"
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

# Parse YAML using yq or python fallback
parse_yaml() {
    local yaml_file="$1"
    local query="$2"

    if command -v yq &> /dev/null; then
        yq eval "$query" "$yaml_file"
    else
        python3 -c "import yaml, json, sys; print(json.dumps(yaml.safe_load(open('$yaml_file'))))" | jq -r "$query"
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
    LOCAL_IDEAS_PATH=$(jq -r '.localIdeasPath // "./ideas"' "$CONFIG_FILE")

    log_info "Configuration loaded"
    log_info "Backend API: $BACKEND_API_URL"
}

# Create session
create_session() {
    local idea_description="$1"
    local user_id="${2:-anonymous}"

    SESSION_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "session-$(date +%s)")
    SESSION_FILE="${SESSIONS_DIR}/${SESSION_ID}.json"

    mkdir -p "$SESSIONS_DIR"

    cat > "$SESSION_FILE" <<EOF
{
  "id": "$SESSION_ID",
  "userId": "$user_id",
  "ideaTitle": "${idea_description:0:200}",
  "status": "active",
  "responses": [],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    log_info "Session created: $SESSION_ID"
}

# Save response to session
save_response() {
    local question_id="$1"
    local answer="$2"

    # Read current session
    local responses=$(jq '.responses' "$SESSION_FILE")

    # Add new response
    local new_response=$(cat <<EOF
{
  "questionId": "$question_id",
  "answer": $(echo "$answer" | jq -R -s .),
  "answeredAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

    # Update session file
    jq ".responses += [$new_response] | .updatedAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$SESSION_FILE" > "${SESSION_FILE}.tmp"
    mv "${SESSION_FILE}.tmp" "$SESSION_FILE"
}

# Load validation questions
load_questions() {
    local guideline_file="${TEMPLATES_DIR}/validation-guidelines/default-questions.yaml"

    if [ ! -f "$guideline_file" ]; then
        log_error "Validation guideline not found: $guideline_file"
        exit 1
    fi

    # Get question count
    if command -v yq &> /dev/null; then
        QUESTION_COUNT=$(yq eval '.questions | length' "$guideline_file")
    else
        QUESTION_COUNT=$(python3 -c "import yaml; print(len(yaml.safe_load(open('$guideline_file'))['questions']))")
    fi

    log_info "Loaded $QUESTION_COUNT validation questions"
}

# Ask a single question
ask_question() {
    local index="$1"
    local guideline_file="${TEMPLATES_DIR}/validation-guidelines/default-questions.yaml"

    # Parse question using yq or python
    if command -v yq &> /dev/null; then
        local question_id=$(yq eval ".questions[$index].id" "$guideline_file")
        local question_text=$(yq eval ".questions[$index].text" "$guideline_file")
        local required=$(yq eval ".questions[$index].required" "$guideline_file")
        local category=$(yq eval ".questions[$index].category" "$guideline_file")
        local options=$(yq eval ".questions[$index].options[]?" "$guideline_file" 2>/dev/null || echo "")
    else
        local question_data=$(python3 -c "import yaml, json; q=yaml.safe_load(open('$guideline_file'))['questions'][$index]; print(json.dumps(q))")
        local question_id=$(echo "$question_data" | jq -r '.id')
        local question_text=$(echo "$question_data" | jq -r '.text')
        local required=$(echo "$question_data" | jq -r '.required')
        local category=$(echo "$question_data" | jq -r '.category')
        local options=$(echo "$question_data" | jq -r '.options[]?' 2>/dev/null || echo "")
    fi

    # Display question
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Question $((index + 1))/$QUESTION_COUNT${NC}"
    echo "Category: $category"
    echo "Required: $required"
    echo ""
    echo -e "${YELLOW}$question_text${NC}"
    echo ""

    # Show options if multiple choice
    if [ -n "$options" ]; then
        echo "Options:"
        local opt_index=0
        while IFS= read -r option; do
            local letter=$(printf "\x$(printf %x $((65 + opt_index)))")
            echo "  $letter) $option"
            ((opt_index++))
        done <<< "$options"
        echo ""
    fi

    # Get answer
    local answer=""
    while true; do
        read -p "Your answer: " answer

        # Validate required fields
        if [ "$required" = "true" ] && [ -z "$answer" ]; then
            log_error "This question is required"
            continue
        fi

        # Accept empty for optional questions
        if [ -z "$answer" ] && [ "$required" = "false" ]; then
            break
        fi

        # Convert option letter to full text if applicable
        if [ -n "$options" ]; then
            if [[ "$answer" =~ ^[A-Za-z]$ ]]; then
                local letter_index=$(($(printf '%d' "'${answer^^}") - 65))
                local selected_option=$(echo "$options" | sed -n "$((letter_index + 1))p")
                if [ -n "$selected_option" ]; then
                    answer="$selected_option"
                fi
            fi
        fi

        break
    done

    # Save response
    save_response "$question_id" "$answer"

    # Show progress
    local completed=$((index + 1))
    local percent=$((completed * 100 / QUESTION_COUNT))
    log_success "Progress: $completed/$QUESTION_COUNT ($percent%)"
}

# Interactive validation loop
run_validation() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}🎯 Idea Validation Workflow${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    for ((i=0; i<QUESTION_COUNT; i++)); do
        ask_question "$i"
    done

    echo ""
    log_success "All questions answered!"
}

# Generate specification from template and responses
generate_spec() {
    local title="$1"
    local user_id="$2"
    local template_file="${TEMPLATES_DIR}/spec-templates/default-spec.md"

    if [ ! -f "$template_file" ]; then
        log_error "Template not found: $template_file"
        exit 1
    fi

    log_info "Generating specification..."

    # Read template
    local spec_content=$(cat "$template_file")

    # Replace basic variables
    spec_content="${spec_content//\{\{title\}\}/$title}"
    spec_content="${spec_content//\{\{author\}\}/$user_id}"
    spec_content="${spec_content//\{\{date\}\}/$(date +%Y-%m-%d)}"

    # Replace question responses
    local responses=$(jq -c '.responses[]' "$SESSION_FILE")
    while IFS= read -r response; do
        local question_id=$(echo "$response" | jq -r '.questionId')
        local answer=$(echo "$response" | jq -r '.answer')

        # Replace {{question_id}} placeholders
        spec_content="${spec_content//\{\{$question_id\}\}/$answer}"
    done <<< "$responses"

    # Remove any remaining unreplaced placeholders
    spec_content=$(echo "$spec_content" | sed 's/{{[^}]*}}//g')

    echo "$spec_content"
}

# Save specification locally
save_spec_local() {
    local spec_content="$1"
    local title="$2"

    # Generate timestamp-based directory name
    local timestamp=$(date -u +%Y%m%d-%H%M%S)
    local slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-50)
    local dir_name="${timestamp}-${slug}"

    # Create local directory
    local local_dir="${LOCAL_IDEAS_PATH}/${dir_name}"
    mkdir -p "$local_dir"

    # Save spec
    local spec_path="${local_dir}/spec.md"
    echo "$spec_content" > "$spec_path"

    log_success "Specification saved locally"
    log_info "Location: $spec_path"

    echo "$spec_path"
}

# Publish to central repository via API
publish_to_api() {
    local spec_content="$1"
    local title="$2"

    log_info "Publishing to central repository..."

    # Extract metadata from responses
    local summary=$(jq -r '.responses[] | select(.questionId == "overview") | .answer' "$SESSION_FILE" || echo "")
    local goals=$(jq -r '[.responses[] | select(.questionId == "success_criteria") | .answer]' "$SESSION_FILE")
    local requirements=$(jq -r '[.responses[] | select(.questionId == "proposed_solution" or .questionId == "user_stories") | .answer]' "$SESSION_FILE")

    # Build API payload
    local payload=$(cat <<EOF
{
  "title": $(echo "$title" | jq -R -s .),
  "specContent": $(echo "$spec_content" | jq -R -s .),
  "metadata": {
    "summary": $(echo "$summary" | jq -R -s .),
    "goals": $goals,
    "requirements": $requirements,
    "tags": []
  }
}
EOF
)

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

        log_success "Published to central repository"
        log_info "Idea ID: $idea_id"
        log_info "Git Path: $git_path"
        log_info "Commit SHA: $commit_sha"

        return 0
    else
        log_warn "Failed to publish to central repository"
        log_warn "HTTP $http_code: $(echo "$body" | jq -r '.message // .error // "Unknown error"')"
        log_warn "Your specification has been saved locally and you can retry publishing later."

        return 1
    fi
}

# Mark session as completed
complete_session() {
    jq '.status = "completed" | .updatedAt = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' "$SESSION_FILE" > "${SESSION_FILE}.tmp"
    mv "${SESSION_FILE}.tmp" "$SESSION_FILE"
}

# Cleanup old sessions (older than 7 days)
cleanup_old_sessions() {
    if [ -d "$SESSIONS_DIR" ]; then
        find "$SESSIONS_DIR" -name "*.json" -type f -mtime +7 -exec rm {} \; 2>/dev/null || true
    fi
}

# Main function
main() {
    local idea_description="${1:-}"
    local user_id="${2:-anonymous}"

    if [ -z "$idea_description" ]; then
        log_error "Usage: $0 <idea-description> [user-id]"
        exit 1
    fi

    # Check dependencies
    check_dependencies

    # Load configuration
    load_config

    # Create session
    create_session "$idea_description" "$user_id"

    # Load questions
    load_questions

    # Run validation
    run_validation

    # Generate specification
    log_info "Generating specification..."
    local spec_content=$(generate_spec "$idea_description" "$user_id")

    # Save locally
    local spec_path=$(save_spec_local "$spec_content" "$idea_description")

    # Complete session
    complete_session

    # Cleanup old sessions
    cleanup_old_sessions

    # Final summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "Specification generated successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Next steps:"
    echo "  - Review specification: cat $spec_path"
    echo "  - Edit specification: \$EDITOR $spec_path"
    echo "  - Publish to central repository: /publish_idea $spec_path"
    echo ""
}

# Run main function
main "$@"
