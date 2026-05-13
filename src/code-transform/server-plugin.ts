import type { UnpluginInstance } from 'unplugin'
import { existsSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { createUnplugin } from 'unplugin'
import { createFileReporter } from '../reporters/node'

export interface NosticsServerOptions {
  /**
   * Path to the log file.
   * @default '.nostics.log'
   */
  logFile?: string

  /**
   * Enable debug logging for the plugin.
   * @default !!process.env.DEBUG
   */
  debug?: boolean
}

export const nosticsServer: UnpluginInstance<NosticsServerOptions | undefined> = createUnplugin(
  (options) => {
    const logFile = options?.logFile ?? '.nostics.log'
    const debug = options?.debug ?? !!process.env.DEBUG
    // eslint-disable-next-line no-console -- debug logging opt-in
    const log = debug ? (...args: unknown[]) => console.log('[nostics]', ...args) : () => {}
    const reporter = createFileReporter({ logFile })

    return {
      name: 'nostics-server',
      enforce: 'pre',

      vite: {
        configureServer(server) {
          const resolvedLogFile = resolve(server.config.root, logFile)
          if (!existsSync(resolvedLogFile)) {
            writeFileSync(resolvedLogFile, '')
          }
          const displayPath = relative(process.cwd(), resolvedLogFile) || logFile
          server.config.logger.info(`📋 nostics ··· saving logs to ${displayPath}`)

          log('listening for diagnostics on ws')

          server.ws.on('nostics:report', (data) => {
            // TODO: validate data shape
            log('received diagnostic', data.name ?? data)
            reporter(data, {})
            log('wrote diagnostic to', displayPath)
          })
        },
      },
    }
  },
)
