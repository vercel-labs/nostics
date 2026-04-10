import type { UnpluginInstance } from 'unplugin'
import { appendFileSync } from 'node:fs'
import { createUnplugin } from 'unplugin'

export interface LogsSdkServerOptions {
  /**
   * Path to the log file.
   * @default '.nostics.log'
   */
  logFile?: string
}

export const logsSDKServer: UnpluginInstance<LogsSdkServerOptions | undefined> = createUnplugin((options) => {
  const logFile = options?.logFile ?? '.nostics.log'

  return {
    name: 'nostics-server',
    enforce: 'pre',

    vite: {
      configureServer(server) {
        server.ws.on('nostics:report', (data) => {
          try {
            // TODO: validate data shape
            appendFileSync(logFile, `${JSON.stringify(data)}\n`)
          }
          catch (err: unknown) {
            console.error(`[nostics]: Failed to write log to "${logFile}":`, err)
          }
        })
      },
    },
  }
})
