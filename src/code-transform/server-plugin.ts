import type { UnpluginInstance } from 'unplugin'
import { appendFileSync } from 'node:fs'
import { createUnplugin } from 'unplugin'

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

    vite: {
      configureServer(server) {
        server.ws.on('logs-sdk:report', (data) => {
          try {
            // TODO: validate data shape
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
