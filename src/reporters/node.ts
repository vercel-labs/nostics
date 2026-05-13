import type { DiagnosticReporter } from '../diagnostic'
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
 * import { defineDiagnostics } from 'nostics'
 * import { createFileReporter } from 'nostics/reporters/node'
 *
 * const diagnostics = defineDiagnostics({
 *   codes: { ... },
 *   reporters: [createFileReporter()],
 * })
 * ```
 */
export function createFileReporter(options?: FileReporterOptions): DiagnosticReporter {
  const logFile = options?.logFile ?? '.nostics.log'
  return (diagnostic) => {
    try {
      appendFileSync(logFile, `${JSON.stringify(diagnostic)}\n`)
    }
    catch (err: unknown) {
      console.error(`[nostics]: Failed to write log to "${logFile}":`, err)
    }
  }
}
