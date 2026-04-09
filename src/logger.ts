import type { CreateLoggerOptions, Diagnostic, DiagnosticActions, Formatter, Logger, Reporter } from './types'
import { CodedError } from './error'
import { plainFormatter } from './format'
import { consoleReporter } from './reporter'

function report(reporters: Reporter[], diagnostic: Diagnostic, formatted: string): void {
  for (const reporter of reporters)
    reporter(diagnostic, formatted)
}

function createActions(
  diagnostic: Diagnostic,
  formatter: Formatter,
  reporters: Reporter[],
): DiagnosticActions {
  return Object.assign({}, diagnostic, {
    throw(): never {
      const formatted = formatter.format(diagnostic)
      report(reporters, diagnostic, formatted)
      throw new CodedError(diagnostic)
    },
    warn() {
      const d = { ...diagnostic, level: 'warn' as const }
      const formatted = formatter.format(d)
      report(reporters, d, formatted)
    },
    error() {
      const d = { ...diagnostic, level: 'error' as const }
      const formatted = formatter.format(d)
      report(reporters, d, formatted)
    },
    log() {
      const formatted = formatter.format(diagnostic)
      report(reporters, diagnostic, formatted)
    },
    format() {
      return formatter.format(diagnostic)
    },
  })
}

export function createLogger<const D extends readonly any[]>(
  options: CreateLoggerOptions<D>,
): Logger<D> {
  const formatter = options.formatter ?? plainFormatter
  const reporters = Array.isArray(options.reporter)
    ? options.reporter
    : [options.reporter ?? consoleReporter]

  const result = {} as any

  // Merge all diagnostic code factories
  for (const diagnostics of options.diagnostics) {
    const codeKeys = typeof diagnostics.codes === 'function'
      ? diagnostics.codes()
      : Object.keys(diagnostics)

    for (const code of codeKeys) {
      if (typeof diagnostics[code] === 'function') {
        result[code] = (...args: any[]) => {
          const diagnostic = diagnostics[code](...args)
          return createActions(diagnostic, formatter, reporters)
        }
      }
    }
  }

  // Raw logger methods
  result.throw = (diagnostic: Diagnostic): never => {
    const formatted = formatter.format(diagnostic)
    report(reporters, diagnostic, formatted)
    throw new CodedError(diagnostic)
  }

  result.warn = (diagnostic: Diagnostic): void => {
    const d = { ...diagnostic, level: 'warn' as const }
    const formatted = formatter.format(d)
    report(reporters, d, formatted)
  }

  result.error = (diagnostic: Diagnostic): void => {
    const d = { ...diagnostic, level: 'error' as const }
    const formatted = formatter.format(d)
    report(reporters, d, formatted)
  }

  result.log = (diagnostic: Diagnostic): void => {
    const formatted = formatter.format(diagnostic)
    report(reporters, diagnostic, formatted)
  }

  result.format = (diagnostic: Diagnostic): string => {
    return formatter.format(diagnostic)
  }

  return result as Logger<D>
}
