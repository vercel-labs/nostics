import type { Diagnostic, DiagnosticReporter } from '../diagnostic'
import { appendFileSync } from 'node:fs'

export interface FileReporterOptions {
  /**
   * Path to the log file.
   * @default '.nostics.log'
   */
  logFile?: string

  /**
   * Stack frames matching ANY of these patterns are removed from
   * `diagnostic.stack` before it is written to the log file. Useful to strip
   * `node_modules` and Node internals. The `Error: ...` header line is
   * always preserved.
   */
  excludeStackFrames?: readonly RegExp[]
}

function applyExcludeStackFrames(raw: string, exclude: readonly RegExp[]): string {
  const [header, ...frames] = raw.split('\n')
  return [header, ...frames.filter(frame => !exclude.some(re => re.test(frame)))].join('\n')
}

/**
 * Creates a reporter that appends diagnostics as NDJSON to a local file.
 * Each diagnostic is written as a single JSON line. The diagnostic's `stack`
 * (if present) is included in the payload; noisy frames can be removed via
 * {@link FileReporterOptions.excludeStackFrames}.
 *
 * @example
 * ```ts
 * import { defineDiagnostics } from 'nostics'
 * import { createFileReporter } from 'nostics/reporters/node'
 *
 * const diagnostics = defineDiagnostics({
 *   codes: { ... },
 *   reporters: [createFileReporter({
 *     excludeStackFrames: [/\/node_modules\//, /\(node:/],
 *   })],
 * })
 * ```
 */
export function createFileReporter(options?: FileReporterOptions): DiagnosticReporter {
  const logFile = options?.logFile ?? '.nostics.log'
  const excludeStackFrames = options?.excludeStackFrames
  return (diagnostic) => {
    try {
      const d = diagnostic as Diagnostic & Record<string, unknown>
      const base: Record<string, unknown>
        = typeof d.toJSON === 'function' ? (d.toJSON() as Record<string, unknown>) : { ...d }
      if (d.stack) {
        base.stack = excludeStackFrames?.length
          ? applyExcludeStackFrames(d.stack, excludeStackFrames)
          : d.stack
      }
      appendFileSync(logFile, `${JSON.stringify(base)}\n`)
    }
    catch (err: unknown) {
      console.error(`[nostics]: Failed to write log to "${logFile}":`, err)
    }
  }
}
