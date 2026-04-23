#!/bin/bash
# Installation script for submit-idea skill

set -e

echo "🚀 Installing submit-idea skill..."

# Check dependencies
echo "📋 Checking dependencies..."

check_command() {
    if command -v "$1" &> /dev/null; then
        echo "  ✅ $1 found"
        return 0
    else
        echo "  ❌ $1 not found"
        return 1
    fi
}

missing_deps=0

check_command "bash" || missing_deps=1

# Check for YAML parser
if check_command "yq"; then
    echo "     Using yq for YAML parsing"
elif check_command "python3"; then
    echo "     Using python3 for YAML parsing"
else
    echo "     Install: brew install yq  (macOS) or  pip install yq"
    missing_deps=1
fi

if [ $missing_deps -eq 1 ]; then
    echo ""
    echo "❌ Missing required dependencies"
    echo "   Please install the missing tools and try again"
    exit 1
fi

# Make scripts executable
echo "🔧 Setting permissions..."
chmod +x scripts/*.sh

# Check workflow definition
if [ ! -f "workflows/idea-workflow.yaml" ]; then
    echo "⚠️  Warning: Workflow definition not found"
    echo "   Download it from central repository:"
    echo "   curl -o workflows/idea-workflow.yaml https://raw.githubusercontent.com/your-org/ideas_central/main/workflows/idea-workflow.yaml"
fi

# Check config.json
if [ ! -f "config.json" ]; then
    echo "❌ Error: config.json not found"
    echo "   Please create config.json with your settings"
    exit 1
fi

# Check if publish_idea skill is installed
PUBLISH_SKILL="${HOME}/.claude/skills/publish-idea/scripts/publish-idea.sh"
if [ ! -f "$PUBLISH_SKILL" ]; then
    echo "⚠️  Warning: publish_idea skill not found"
    echo "   Install it first: cd publish-idea-skill && ./install.sh"
    echo "   submit_idea requires publish_idea to function"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure publish_idea skill is installed"
echo "  2. Download workflow definition if not present"
echo "  3. Test the skill: ./scripts/submit-idea.sh ideas/my-idea/spec.md"
echo ""
echo "Or use via Claude Code: /submit_idea <spec-file-path>"
