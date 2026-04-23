#!/bin/bash
# Submit Idea - Workflow Gate Validation and Publishing
# Validates workflow gates and publishes to central repository

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Configuration
CONFIG_FILE="${SKILL_DIR}/config.json"
WORKFLOW_FILE="${SKILL_DIR}/workflows/idea-workflow.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[submit-idea]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[submit-idea]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[submit-idea]${NC} $1"
}

log_error() {
    echo -e "${RED}[submit-idea]${NC} $1" >&2
}

log_gate() {
    echo -e "${CYAN}[gate]${NC} $1"
}

# Check dependencies
check_dependencies() {
    local missing=0

    if ! command -v yq &> /dev/null && ! command -v python3 &> /dev/null; then
        log_error "Either yq or python3 is required for YAML parsing"
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
        python3 -c "import yaml, json, sys; data=yaml.safe_load(open('$yaml_file')); print(json.dumps(data))" | jq -r "$query"
    fi
}

# Load workflow definition
load_workflow() {
    if [ ! -f "$WORKFLOW_FILE" ]; then
        log_error "Workflow definition not found: $WORKFLOW_FILE"
        log_error "Download it from central repository"
        exit 1
    fi

    log_info "Loading workflow definition..."

    WORKFLOW_NAME=$(parse_yaml "$WORKFLOW_FILE" '.name // "idea-workflow"')
    WORKFLOW_VERSION=$(parse_yaml "$WORKFLOW_FILE" '.version // "1.0.0"')

    log_info "Workflow: $WORKFLOW_NAME v$WORKFLOW_VERSION"
}

# Validate artifact gate
validate_artifact_gate() {
    local spec_path="$1"
    local passed=0
    local failures=()

    log_gate "Running gate: artifact_check"

    # Check spec.md exists
    if [ ! -f "$spec_path" ]; then
        failures+=("❌ spec.md not found at: $spec_path")
        passed=1
    else
        log_gate "✓ spec.md exists"

        # Check minimum size
        local file_size=$(stat -f%z "$spec_path" 2>/dev/null || stat -c%s "$spec_path" 2>/dev/null)
        if [ "$file_size" -lt 100 ]; then
            failures+=("❌ spec.md is too small ($file_size bytes, minimum 100 bytes)")
            passed=1
        else
            log_gate "✓ spec.md size OK ($file_size bytes)"
        fi
    fi

    if [ $passed -eq 0 ]; then
        log_success "Gate passed: artifact_check"
        return 0
    else
        log_error "Gate failed: artifact_check"
        for failure in "${failures[@]}"; do
            echo "  $failure"
        done
        return 1
    fi
}

# Validate content gate
validate_content_gate() {
    local spec_path="$1"
    local passed=0
    local failures=()
    local warnings=()

    log_gate "Running gate: content_validation"

    if [ ! -f "$spec_path" ]; then
        log_error "Cannot validate content - spec.md not found"
        return 1
    fi

    local spec_content=$(cat "$spec_path")

    # Check for title
    if echo "$spec_content" | grep -q "^# "; then
        log_gate "✓ Has title"
    else
        failures+=("❌ Missing title (# heading)")
        passed=1
    fi

    # Check for Problem Statement
    if echo "$spec_content" | grep -q "## Problem Statement"; then
        log_gate "✓ Has Problem Statement section"
    else
        failures+=("❌ Missing 'Problem Statement' section")
        passed=1
    fi

    # Check for Proposed Solution
    if echo "$spec_content" | grep -q "## Proposed Solution"; then
        log_gate "✓ Has Proposed Solution section"
    else
        failures+=("❌ Missing 'Proposed Solution' section")
        passed=1
    fi

    # Check for Success Criteria (warning only)
    if echo "$spec_content" | grep -q "## Success Criteria"; then
        log_gate "✓ Has Success Criteria section"
    else
        warnings+=("⚠️  No Success Criteria section found")
    fi

    # Show warnings
    for warning in "${warnings[@]}"; do
        log_warn "$warning"
    done

    if [ $passed -eq 0 ]; then
        log_success "Gate passed: content_validation"
        return 0
    else
        log_error "Gate failed: content_validation"
        for failure in "${failures[@]}"; do
            echo "  $failure"
        done
        return 1
    fi
}

# Run all gates
run_gates() {
    local spec_path="$1"
    local all_passed=0

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}Running Submit Stage Gates${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Gate 1: Artifact Check
    if ! validate_artifact_gate "$spec_path"; then
        all_passed=1
    fi

    echo ""

    # Gate 2: Content Validation
    if ! validate_content_gate "$spec_path"; then
        all_passed=1
    fi

    echo ""

    if [ $all_passed -eq 0 ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_success "All gates passed ✓"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        return 0
    else
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_error "Gate validation failed ✗"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        return 1
    fi
}

# Invoke publish_idea skill
invoke_publish() {
    local spec_path="$1"

    log_info "Invoking publish_idea skill..."
    echo ""

    # Check if publish_idea script exists
    local publish_script="${SKILL_DIR}/../publish-idea/scripts/publish-idea.sh"

    if [ ! -f "$publish_script" ]; then
        # Try alternate location (if installed separately)
        publish_script="${HOME}/.claude/skills/publish-idea/scripts/publish-idea.sh"
    fi

    if [ ! -f "$publish_script" ]; then
        log_error "publish_idea skill not found"
        log_error "Install it first: cd ../publish-idea && ./install.sh"
        exit 1
    fi

    # Execute publish_idea
    "$publish_script" "$spec_path"
}

# Main function
main() {
    local spec_path="${1:-}"

    if [ -z "$spec_path" ]; then
        log_error "Usage: $0 <spec-file-path>"
        log_error ""
        log_error "This command validates workflow gates and publishes to central repository."
        log_error ""
        log_error "Examples:"
        log_error "  $0 ideas/20260423-110000-my-idea/spec.md"
        log_error "  $0 ./ideas/my-idea/spec.md"
        exit 1
    fi

    # Check dependencies
    check_dependencies

    # Load workflow definition
    load_workflow

    # Run gates
    if run_gates "$spec_path"; then
        # Gates passed - invoke publish
        invoke_publish "$spec_path"
    else
        # Gates failed
        echo ""
        log_error "Submit failed - fix validation errors and try again"
        echo ""
        log_info "Next steps:"
        log_info "  1. Fix the validation errors listed above"
        log_info "  2. Edit your spec: \$EDITOR $spec_path"
        log_info "  3. Retry: /submit_idea $spec_path"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
