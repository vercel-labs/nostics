#!/usr/bin/env bash
# Stop hook: consume the first diagnostic from .nostics.log
# If found, outputs JSON with additionalContext so Claude addresses the issue.
# If no log file or empty, exits silently.

LOG_FILE="${CLAUDE_PROJECT_DIR:-.}/.nostics.log"

# No log file or empty — nothing to do
if [ ! -s "$LOG_FILE" ]; then
  exit 0
fi

# Read the first line
FIRST_LINE=$(head -n 1 "$LOG_FILE")

# If the line is empty, bail
if [ -z "$FIRST_LINE" ]; then
  exit 0
fi

# Remove the first line from the file
tail -n +2 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"

# Output context for Claude to act on
cat <<EOF
{
  "additionalContext": "A runtime diagnostic was emitted by the application:\n${FIRST_LINE}\nPlease investigate and address this diagnostic. Check the source code related to this error code and fix the root cause."
}
EOF
