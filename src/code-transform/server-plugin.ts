import type { UnpluginInstance } from 'unplugin'
import { existsSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import { createUnplugin } from 'unplugin'
import { createFileReporter } from '../node-reporter'

export interface LogsSdkServerOptions {
  /**
   * Path to the log file.
   * @default '.diagnostics.log'
   */
  logFile?: string
}

export const logsSDKServer: UnpluginInstance<LogsSdkServerOptions | undefined> = createUnplugin((options) => {
  const logFile = options?.logFile ?? '.diagnostics.log'
  const reporter = createFileReporter({ logFile })

  return {
    name: 'logs-sdk-server',
    enforce: 'pre',

    vite: {
      configureServer(server) {
        const resolvedLogFile = resolve(server.config.root, logFile)
        if (!existsSync(resolvedLogFile)) {
          writeFileSync(resolvedLogFile, '')
        }
        const displayPath = relative(process.cwd(), resolvedLogFile) || logFile
        server.config.logger.info(`📋 logs-sdk ··· saving logs to ${displayPath}`)

        server.ws.on('logs-sdk:report', (data) => {
          // TODO: validate data shape
          reporter(data, '')
        })
      },
    },
  }
})
