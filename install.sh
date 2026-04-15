#!/usr/bin/env bash
#
# logs-sdk Claude Code Plugin Installer
#
# Adds the repo as a marketplace and installs the plugin project-scoped.
# Run from your project root — the plugin is scoped to $PWD.
#
# Usage: gh api repos/vercel-labs/logs-sdk/contents/install.sh --jq '.content' | base64 -d | bash
#

set -e

PLUGIN_NAME="logs-sdk"
MARKETPLACE_NAME="vercel-labs"
REPO="vercel-labs/logs-sdk"

echo "logs-sdk Claude Code Plugin Installer"
echo ""

# Add the marketplace (skip if already registered)
if claude plugin marketplace list 2>/dev/null | grep -q "  $MARKETPLACE_NAME$"; then
    echo "-> Updating marketplace..."
    claude plugin marketplace update "$MARKETPLACE_NAME"
else
    echo "-> Adding marketplace..."
    claude plugin marketplace add "$REPO" --scope project
fi

# Install the plugin project-scoped (auto-enables)
echo "-> Installing plugin..."
claude plugin install "${PLUGIN_NAME}@${MARKETPLACE_NAME}" --scope project

echo ""
echo "Installed successfully! Restart Claude Code for the plugin to take effect."
