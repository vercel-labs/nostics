import type { FileReporterOptions } from 'nostics/reporters/node'
import type { UnpluginInstance } from 'unplugin'
import { existsSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { createFileReporter } from 'nostics/reporters/node'
import { createUnplugin } from 'unplugin'

export interface NosticsCollectorOptions {
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

  /**
   * Stack frames matching ANY of these patterns are removed from each
   * diagnostic's stack trace before it is written to the log file.
   * Forwarded to {@link createFileReporter}. Pass an empty array to keep
   * every frame.
   * @default [/\/node_modules\//i]
   */
  excludeStackFrames?: readonly RegExp[]
}

/**
 * Dev-server collector that forwards browser diagnostics to a log file.
 *
 * Listens on the Vite dev-server WebSocket for diagnostics emitted by
 * `createDevReporter()` in the browser and appends them as NDJSON to a local
 * log file via `createFileReporter`.
 *
 * ```ts
 * // vite.config.ts
 * import { nosticsCollector } from '@nostics/unplugin/dev-server-collector'
 * export default defineConfig({ plugins: [nosticsCollector.vite()] })
 * ```
 *
 * Note: Vite only. Other unplugin adapters are no-ops.
 */
export const nosticsCollector: UnpluginInstance<NosticsCollectorOptions | undefined>
  = createUnplugin((options) => {
    const logFile = options?.logFile ?? '.nostics.log'
    const debug = options?.debug ?? !!process.env.DEBUG
    // eslint-disable-next-line no-console -- debug logging opt-in
    const log = debug ? (...args: unknown[]) => console.log('[nostics]', ...args) : () => {}
    const reporterOptions: FileReporterOptions = {
      logFile,
      excludeStackFrames: options?.excludeStackFrames,
    }
    const reporter = createFileReporter(reporterOptions)

    return {
      name: 'nostics:collector',
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
  })
