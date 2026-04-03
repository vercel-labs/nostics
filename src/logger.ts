import type { CreateLoggerOptions, Diagnostic, DiagnosticActions, Formatter, Logger, Reporter } from './types'
import { CodedError } from './error'
import { plainFormatter } from './format'
import { consoleReporter } from './reporter'

function createActions(
  diagnostic: Diagnostic,
  formatter: Formatter,
  reporter: Reporter,
): DiagnosticActions {
  return Object.assign({}, diagnostic, {
    throw(): never {
      const formatted = formatter.format(diagnostic)
      reporter.report(diagnostic, formatted)
      throw new CodedError(diagnostic)
    },
    warn() {
      const d = { ...diagnostic, level: 'warn' as const }
      const formatted = formatter.format(d)
      reporter.report(d, formatted)
    },
    error() {
      const d = { ...diagnostic, level: 'error' as const }
      const formatted = formatter.format(d)
      reporter.report(d, formatted)
    },
    log() {
      const formatted = formatter.format(diagnostic)
      reporter.report(diagnostic, formatted)
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
  const reporter = options.reporter ?? consoleReporter

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
          return createActions(diagnostic, formatter, reporter)
        }
      }
    }
  }

  // Raw logger methods
  result.throw = (diagnostic: Diagnostic): never => {
    const formatted = formatter.format(diagnostic)
    reporter.report(diagnostic, formatted)
    throw new CodedError(diagnostic)
  }

  result.warn = (diagnostic: Diagnostic): void => {
    const d = { ...diagnostic, level: 'warn' as const }
    const formatted = formatter.format(d)
    reporter.report(d, formatted)
  }

  result.error = (diagnostic: Diagnostic): void => {
    const d = { ...diagnostic, level: 'error' as const }
    const formatted = formatter.format(d)
    reporter.report(d, formatted)
  }

  result.log = (diagnostic: Diagnostic): void => {
    const formatted = formatter.format(diagnostic)
    reporter.report(diagnostic, formatted)
  }

  result.format = (diagnostic: Diagnostic): string => {
    return formatter.format(diagnostic)
  }

  return result as Logger<D>
}
