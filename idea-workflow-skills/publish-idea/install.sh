#!/bin/bash
# Installation script for publish-idea skill

set -e

echo "🚀 Installing publish-idea skill..."

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
check_command "jq" || {
    echo "     Install: brew install jq  (macOS) or  apt-get install jq  (Linux)"
    missing_deps=1
}
check_command "curl" || missing_deps=1

if [ $missing_deps -eq 1 ]; then
    echo ""
    echo "❌ Missing required dependencies"
    echo "   Please install the missing tools and try again"
    exit 1
fi

# Make scripts executable
echo "🔧 Setting permissions..."
chmod +x scripts/*.sh

# Check config.json
if [ ! -f "config.json" ]; then
    echo "❌ Error: config.json not found"
    echo "   Please create config.json with your settings"
    exit 1
fi

# Validate config.json
if ! jq empty config.json 2>/dev/null; then
    echo "❌ Error: config.json is not valid JSON"
    exit 1
fi

# Check AUTH_TOKEN environment variable
if [ -z "$AUTH_TOKEN" ]; then
    echo "⚠️  Warning: AUTH_TOKEN environment variable not set"
    echo "   Set it with: export AUTH_TOKEN='your-token'"
    echo "   Or add to ~/.bashrc: echo 'export AUTH_TOKEN=\"your-token\"' >> ~/.bashrc"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Configure backend URL in config.json"
echo "  2. Set AUTH_TOKEN: export AUTH_TOKEN='your-token'"
echo "  3. Test the skill: ./scripts/publish-idea.sh ideas/my-idea/spec.md"
echo ""
echo "Or use via Claude Code: /publish_idea <spec-file-path>"
