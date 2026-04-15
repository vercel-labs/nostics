#!/bin/sh

# Find vite config in project root
vite_config=$(ls "${CLAUDE_PROJECT_DIR:-.}"/vite.config.* 2>/dev/null | head -1)
[ -z "$vite_config" ] && exit 0

# Check for the dev server plugin import
grep -q "logsSDKServer" "$vite_config" && exit 0

# Not found — nudge Claude to suggest it
cat <<'MSG'
The project uses Vite but hasn't added the logs-sdk dev server plugin.
Suggest adding it to their vite config:

import { logsSDKServer } from 'logs-sdk/unplugin'
// in plugins array:
logsSDKServer.vite()
MSG
