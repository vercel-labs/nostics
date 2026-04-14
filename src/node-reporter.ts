import type { Reporter } from './reporter'
import { appendFileSync } from 'node:fs'

export interface FileReporterOptions {
  /**
   * Path to the log file.
   * @default '.nostics.log'
   */
  logFile?: string
}

/**
 * Creates a reporter that appends diagnostics as NDJSON to a local file.
 * Each diagnostic is written as a single JSON line.
 *
 * @example
 * ```ts
 * import { createFileReporter } from 'nostics/node-reporter'
 *
 * const log = createLogger({
 *   diagnostics: [diagnostics],
 *   reporter: [consoleReporter, createFileReporter()],
 * })
 * ```
 */
export function createFileReporter(options?: FileReporterOptions): Reporter {
  const logFile = options?.logFile ?? '.nostics.log'
  return (diagnostic, _formatted) => {
    try {
      appendFileSync(logFile, `${JSON.stringify(diagnostic)}\n`)
    }
    catch (err: unknown) {
      console.error(`[nostics]: Failed to write log to "${logFile}":`, err)
    }
  }
}
