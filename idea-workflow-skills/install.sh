#!/bin/bash
# Master installation script for idea-workflow-skills
# Can be run locally or remotely via curl | bash
# Installs skills to Claude Code skills directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_TARGET_DIR="${HOME}/.claude/skills"
REPO_URL="https://github.com/raycarroll/et_asdlc.git"
REPO_BRANCH="main"
REPO_SUBDIR="idea-workflow-skills"

# Parse command line arguments
INSTALL_MODE="all"
SKIP_DEPS_CHECK=false
TARGET_DIR=""
FORCE=false
LOCAL_SOURCE=""

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --target-dir DIR        Install to specified directory (default: ~/.claude/skills)"
    echo "  --expand-only           Install only expand-idea skill"
    echo "  --publish-only          Install only publish-idea skill"
    echo "  --submit-only           Install only submit-idea skill"
    echo "  --local-source DIR      Install from local directory instead of downloading"
    echo "  --force                 Overwrite existing installation"
    echo "  --skip-deps-check       Skip dependency checks"
    echo "  --help, -h              Show this help message"
    echo ""
    echo "Examples:"
    echo "  # Remote install (all skills to ~/.claude/skills/)"
    echo "  curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash"
    echo ""
    echo "  # Remote install with custom directory"
    echo "  curl -fsSL https://... | bash -s -- --target-dir /custom/path"
    echo ""
    echo "  # Local install"
    echo "  ./install.sh"
    echo "  ./install.sh --target-dir /custom/path"
    echo ""
    echo "  # Install from local source"
    echo "  ./install.sh --local-source /path/to/idea-workflow-skills"
    echo ""
    echo "Note: Each skill will be installed as a separate directory under the target directory."
    echo "      Example: ~/.claude/skills/expand-idea/, ~/.claude/skills/publish-idea/"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --target-dir)
            TARGET_DIR="$2"
            shift 2
            ;;
        --expand-only)
            INSTALL_MODE="expand"
            shift
            ;;
        --publish-only)
            INSTALL_MODE="publish"
            shift
            ;;
        --submit-only)
            INSTALL_MODE="submit"
            shift
            ;;
        --local-source)
            LOCAL_SOURCE="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --skip-deps-check)
            SKIP_DEPS_CHECK=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Run with --help for usage information"
            exit 1
            ;;
    esac
done

# Set default target directory if not specified
if [ -z "$TARGET_DIR" ]; then
    TARGET_DIR="$DEFAULT_TARGET_DIR"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}Idea Workflow Skills - Installation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Target directory:${NC} $TARGET_DIR"
echo -e "${BLUE}Install mode:${NC} $INSTALL_MODE"
echo ""

# Check dependencies function
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "  ${GREEN}✅${NC} $1 found"
        return 0
    else
        echo -e "  ${RED}❌${NC} $1 not found"
        return 1
    fi
}

# Global dependency check
if [ "$SKIP_DEPS_CHECK" = false ]; then
    echo -e "${BLUE}📋 Checking dependencies...${NC}"
    echo ""

    missing_deps=0

    # Required by all skills
    check_command "bash" || missing_deps=1
    check_command "jq" || {
        echo "     Install: brew install jq  (macOS) or  apt-get install jq  (Linux)"
        missing_deps=1
    }

    # Required for remote installation
    if [ -z "$LOCAL_SOURCE" ]; then
        check_command "git" || {
            echo "     Install: brew install git  (macOS) or  apt-get install git  (Linux)"
            missing_deps=1
        }
    fi

    # Required by expand-idea
    if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "expand" ]]; then
        if check_command "yq"; then
            echo "     Using yq for YAML parsing"
        elif check_command "python3"; then
            echo "     Using python3 for YAML parsing (yq not found)"
        else
            echo "     Install: brew install yq  (macOS) or  pip install yq"
            missing_deps=1
        fi
    fi

    # Required by publish-idea and submit-idea
    if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "publish" || "$INSTALL_MODE" == "submit" ]]; then
        check_command "curl" || missing_deps=1
    fi

    if [ $missing_deps -eq 1 ]; then
        echo ""
        echo -e "${RED}❌ Missing required dependencies${NC}"
        echo "   Please install the missing tools and try again"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}✅ All dependencies satisfied${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping dependency checks${NC}"
    echo ""
fi

# Determine source directory
if [ -n "$LOCAL_SOURCE" ]; then
    # User specified local source
    SOURCE_DIR="$LOCAL_SOURCE"
    echo -e "${BLUE}📂 Using local source:${NC} $SOURCE_DIR"

    if [ ! -d "$SOURCE_DIR" ]; then
        echo -e "${RED}❌ Error: Local source directory not found: $SOURCE_DIR${NC}"
        exit 1
    fi
else
    # Check if running from within the repo
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"

    if [ -n "$SCRIPT_DIR" ] && [ -d "$SCRIPT_DIR/expand-idea" ]; then
        # Running locally from repo
        SOURCE_DIR="$SCRIPT_DIR"
        echo -e "${BLUE}📂 Using local repository${NC}"
    else
        # Remote execution - need to clone
        echo -e "${BLUE}📥 Downloading from repository...${NC}"

        TEMP_DIR=$(mktemp -d)
        trap "rm -rf $TEMP_DIR" EXIT

        echo "   Cloning: $REPO_URL (branch: $REPO_BRANCH)"

        if ! git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$TEMP_DIR/repo" 2>/dev/null; then
            echo -e "${RED}❌ Failed to clone repository${NC}"
            echo "   Repository: $REPO_URL"
            echo "   Branch: $REPO_BRANCH"
            exit 1
        fi

        SOURCE_DIR="$TEMP_DIR/repo/$REPO_SUBDIR"

        if [ ! -d "$SOURCE_DIR" ]; then
            echo -e "${RED}❌ Error: Skills directory not found in repository${NC}"
            echo "   Expected: $REPO_SUBDIR"
            exit 1
        fi

        echo -e "${GREEN}✅${NC} Repository downloaded"
    fi
fi

echo ""

# Check if any skills already exist
existing_skills=()
case $INSTALL_MODE in
    expand) [ -d "$TARGET_DIR/expand-idea" ] && existing_skills+=("expand-idea") ;;
    publish) [ -d "$TARGET_DIR/publish-idea" ] && existing_skills+=("publish-idea") ;;
    submit) [ -d "$TARGET_DIR/submit-idea" ] && existing_skills+=("submit-idea") ;;
    all)
        [ -d "$TARGET_DIR/expand-idea" ] && existing_skills+=("expand-idea")
        [ -d "$TARGET_DIR/publish-idea" ] && existing_skills+=("publish-idea")
        [ -d "$TARGET_DIR/submit-idea" ] && existing_skills+=("submit-idea")
        ;;
esac

if [ ${#existing_skills[@]} -gt 0 ] && [ "$FORCE" = false ]; then
    echo -e "${YELLOW}⚠️  Existing skills found: ${existing_skills[*]}${NC}"
    echo ""
    read -p "Overwrite existing skills? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 1
    fi
    echo ""
elif [ ${#existing_skills[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Overwriting existing skills: ${existing_skills[*]} (--force)${NC}"
    echo ""
fi

# Create target directory
mkdir -p "$TARGET_DIR"

# Install function
install_skill() {
    local skill_name=$1
    local skill_source="${SOURCE_DIR}/${skill_name}"
    local skill_target="${TARGET_DIR}/${skill_name}"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}Installing ${skill_name}...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ ! -d "$skill_source" ]; then
        echo -e "${RED}❌ Error: ${skill_source} not found${NC}"
        return 1
    fi

    # Copy skill directory
    echo -e "${BLUE}Copying files...${NC}"
    rm -rf "$skill_target"
    cp -r "$skill_source" "$skill_target"
    echo -e "${GREEN}✅${NC} Files copied to $skill_target"

    # Make scripts executable
    if [ -d "$skill_target/scripts" ]; then
        chmod +x "$skill_target/scripts"/*.sh
        echo -e "${GREEN}✅${NC} Scripts made executable"
    fi

    # Check config.json exists
    if [ ! -f "$skill_target/config.json" ]; then
        echo -e "${YELLOW}⚠️  Warning: config.json not found${NC}"
        echo "   You may need to create it before using the skill"
    else
        # Validate config.json
        if jq empty "$skill_target/config.json" 2>/dev/null; then
            echo -e "${GREEN}✅${NC} config.json is valid"
        else
            echo -e "${RED}❌ Error: config.json is not valid JSON${NC}"
            return 1
        fi
    fi

    echo ""
    echo -e "${GREEN}✅ ${skill_name} installed successfully${NC}"
    echo ""

    return 0
}

# Install based on mode
case $INSTALL_MODE in
    expand)
        install_skill "expand-idea" || exit 1
        ;;
    publish)
        install_skill "publish-idea" || exit 1
        ;;
    submit)
        install_skill "submit-idea" || exit 1
        ;;
    all)
        install_skill "expand-idea" || exit 1
        install_skill "publish-idea" || exit 1
        install_skill "submit-idea" || exit 1
        ;;
esac

# Copy README if installing all
if [ "$INSTALL_MODE" = "all" ] && [ -f "$SOURCE_DIR/README.md" ]; then
    cp "$SOURCE_DIR/README.md" "$TARGET_DIR/README.md"
    echo -e "${GREEN}✅${NC} README.md copied"
    echo ""
fi

# Final summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Installation location
echo -e "${CYAN}Installed Skills:${NC}"
case $INSTALL_MODE in
    expand)
        echo "  ✓ /expand_idea → ${TARGET_DIR}/expand-idea/"
        ;;
    publish)
        echo "  ✓ /publish_idea → ${TARGET_DIR}/publish-idea/"
        ;;
    submit)
        echo "  ✓ /submit_idea → ${TARGET_DIR}/submit-idea/"
        ;;
    all)
        echo "  ✓ /expand_idea → ${TARGET_DIR}/expand-idea/"
        echo "  ✓ /publish_idea → ${TARGET_DIR}/publish-idea/"
        echo "  ✓ /submit_idea → ${TARGET_DIR}/submit-idea/"
        ;;
esac
echo ""

# Configuration steps
echo -e "${CYAN}Next Steps:${NC}"
echo ""

if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "publish" || "$INSTALL_MODE" == "submit" ]]; then
    echo "1. Set up authentication:"
    echo "   export AUTH_TOKEN='your-api-token'"
    echo "   # Or add to ~/.bashrc or ~/.zshrc:"
    echo "   echo 'export AUTH_TOKEN=\"your-token\"' >> ~/.bashrc"
    echo ""

    echo "2. Configure backend API URL in config.json files:"
    if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "publish" ]]; then
        echo "   ${TARGET_DIR}/publish-idea/config.json"
    fi
    if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "submit" ]]; then
        echo "   ${TARGET_DIR}/submit-idea/config.json"
    fi
    echo ""
fi

if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "expand" ]]; then
    echo "3. Configure expand-idea settings:"
    echo "   ${TARGET_DIR}/expand-idea/config.json"
    echo ""
fi

# Environment check
if [ -z "$AUTH_TOKEN" ] && [[ "$INSTALL_MODE" != "expand" ]]; then
    echo -e "${YELLOW}⚠️  AUTH_TOKEN environment variable not set${NC}"
    echo "   Publishing skills require authentication"
    echo ""
fi

# Usage examples
echo -e "${CYAN}Usage Examples:${NC}"
echo ""

case $INSTALL_MODE in
    expand)
        echo "  # Create a new idea specification"
        echo "  /expand_idea \"Add user authentication with OAuth2\""
        ;;
    publish)
        echo "  # Publish a specification"
        echo "  /publish_idea ideas/20260423-110000-my-idea/spec.md"
        ;;
    submit)
        echo "  # Validate and publish"
        echo "  /submit_idea ideas/20260423-110000-my-idea/spec.md"
        ;;
    all)
        echo "  # Full workflow"
        echo "  /expand_idea \"Add user authentication with OAuth2\""
        echo "  # Edit spec.md as needed, then:"
        echo "  /submit_idea ideas/20260423-110000-oauth2-auth/spec.md"
        echo ""
        echo "  # Or publish without validation"
        echo "  /publish_idea ideas/20260423-110000-oauth2-auth/spec.md"
        ;;
esac

echo ""
echo -e "${CYAN}Documentation:${NC}"
if [ -f "$TARGET_DIR/README.md" ]; then
    echo "  README: ${TARGET_DIR}/README.md"
fi
if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "expand" ]]; then
    echo "  expand-idea: ${TARGET_DIR}/expand-idea/skill.md"
fi
if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "publish" ]]; then
    echo "  publish-idea: ${TARGET_DIR}/publish-idea/skill.md"
fi
if [[ "$INSTALL_MODE" == "all" || "$INSTALL_MODE" == "submit" ]]; then
    echo "  submit-idea: ${TARGET_DIR}/submit-idea/skill.md"
fi
echo ""

echo -e "${GREEN}Happy idea creation! 🚀${NC}"
echo ""
