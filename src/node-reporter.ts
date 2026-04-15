import type { Reporter } from './reporter'
import { appendFileSync } from 'node:fs'

export interface FileReporterOptions {
  /**
   * Path to the log file.
   * @default '.diagnostics.log'
   */
  logFile?: string
}

/**
 * Creates a reporter that appends diagnostics as NDJSON to a local file.
 * Each diagnostic is written as a single JSON line.
 *
 * @example
 * ```ts
 * import { createFileReporter } from 'logs-sdk/node-reporter'
 *
 * const log = createLogger({
 *   diagnostics: [diagnostics],
 *   reporter: [consoleReporter, createFileReporter()],
 * })
 * ```
 */
export function createFileReporter(options?: FileReporterOptions): Reporter {
  const logFile = options?.logFile ?? '.diagnostics.log'
  return (diagnostic, _formatted) => {
    try {
      appendFileSync(logFile, `${JSON.stringify(diagnostic)}\n`)
    }
    catch (err: unknown) {
      console.error(`[logs-sdk]: Failed to write log to "${logFile}":`, err)
    }
  }
}
