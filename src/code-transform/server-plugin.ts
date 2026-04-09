import type { UnpluginInstance } from 'unplugin'
import { appendFileSync } from 'node:fs'
import { createUnplugin } from 'unplugin'

const VIRTUAL_ID = 'logs-sdk/dev-reporter'
const VIRTUAL_ID_RE = /^logs-sdk\/dev-reporter$/
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`
const RESOLVED_VIRTUAL_ID_RE = /^\0logs-sdk\/dev-reporter$/

export interface LogsSdkServerOptions {
  /**
   * Path to the log file.
   * @default '.logs-sdk.log'
   */
  logFile?: string
}

export const logsSDKServer: UnpluginInstance<LogsSdkServerOptions | undefined> = createUnplugin((options) => {
  const logFile = options?.logFile ?? '.logs-sdk.log'

  return {
    name: 'logs-sdk-server',
    enforce: 'pre',

    resolveId: {
      filter: {
        // raw string didn't work
        id: VIRTUAL_ID_RE,
      },
      handler() {
        return RESOLVED_VIRTUAL_ID
      },
    },
    load: {
      filter: {
        // raw string didn't work
        id: RESOLVED_VIRTUAL_ID_RE,
      },
      handler() {
        return `export const devReporter = {
  report(diagnostic) {
    if (import.meta.hot) {
      import.meta.hot.send('logs-sdk:report', diagnostic)
    }
  }
}
`
      },
    },

    vite: {
      configureServer(server) {
        server.ws.on('logs-sdk:report', (data) => {
          try {
            appendFileSync(logFile, `${JSON.stringify(data)}\n`)
          }
          catch (err: unknown) {
            console.error(`[logs-sdk]: Failed to write log to "${logFile}":`, err)
          }
        })
      },
    },
  }
})
