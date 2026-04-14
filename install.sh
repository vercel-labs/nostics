#!/usr/bin/env bash
#
# nostics Claude Code Plugin Installer
#
# Clones the plugin and registers it in Claude Code's installed_plugins.json
# so it loads automatically without --plugin-dir.
#
# Usage: gh api repos/vercel-labs/nostics/contents/install.sh --jq '.content' | base64 -d | bash
#

set -e

PLUGIN_NAME="nostics"
MARKETPLACE_NAME="vercel-labs"
PLUGIN_KEY="${PLUGIN_NAME}@${MARKETPLACE_NAME}"
REPO="vercel-labs/nostics"
REPO_URL="https://github.com/${REPO}.git"
PLUGINS_DIR="$HOME/.claude/plugins"
INSTALLED_JSON="$PLUGINS_DIR/installed_plugins.json"

echo "nostics Claude Code Plugin Installer"
echo ""

# Clone or update the plugin into a temp location first to read the version
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "-> Cloning plugin..."
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
    gh repo clone "$REPO" "$TEMP_DIR" -- --quiet 2>/dev/null || \
        git clone --quiet "$REPO_URL" "$TEMP_DIR"
else
    git clone --quiet "$REPO_URL" "$TEMP_DIR"
fi

VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$TEMP_DIR/.claude-plugin/plugin.json','utf8')).version)")
INSTALL_DIR="$PLUGINS_DIR/cache/$MARKETPLACE_NAME/$PLUGIN_NAME/$VERSION"

# Move to final location
mkdir -p "$(dirname "$INSTALL_DIR")"
if [ -d "$INSTALL_DIR" ]; then
    echo "-> Updating existing installation..."
    rm -rf "$INSTALL_DIR"
fi
mv "$TEMP_DIR" "$INSTALL_DIR"
trap - EXIT

COMMIT_SHA=$(cd "$INSTALL_DIR" && git rev-parse HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "-> Registering plugin in Claude Code..."

if [ ! -f "$INSTALLED_JSON" ]; then
    mkdir -p "$PLUGINS_DIR"
    echo '{"version": 2, "plugins": {}}' > "$INSTALLED_JSON"
fi

node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$INSTALLED_JSON', 'utf8'));
data.plugins = data.plugins || {};
data.plugins['$PLUGIN_KEY'] = [{
    scope: 'user',
    installPath: '$INSTALL_DIR',
    version: '$VERSION',
    installedAt: '$TIMESTAMP',
    lastUpdated: '$TIMESTAMP',
    gitCommitSha: '$COMMIT_SHA',
    isLocal: true
}];
fs.writeFileSync('$INSTALLED_JSON', JSON.stringify(data, null, 2));
"

echo ""
echo "Installed successfully!"
echo ""
echo "   Location: $INSTALL_DIR"
echo "   Version:  $VERSION"
echo ""
echo "Restart Claude Code for the plugin to take effect."
