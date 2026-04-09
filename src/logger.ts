import type { CreateLoggerOptions, Diagnostic, DiagnosticActions, Formatter, Logger, Reporter } from './types'
import { CodedError } from './error'
import { plainFormatter } from './format'
import { consoleReporter } from './reporter'

function formatAndReport(formatter: Formatter, reporters: Reporter[], diagnostic: Diagnostic): string {
  const formatted = formatter(diagnostic)
  for (const reporter of reporters)
    reporter(diagnostic, formatted)
  return formatted
}

function createActions(
  diagnostic: Diagnostic,
  formatter: Formatter,
  reporters: Reporter[],
): DiagnosticActions {
  return Object.assign({}, diagnostic, {
    throw(): never {
      formatAndReport(formatter, reporters, diagnostic)
      throw new CodedError(diagnostic)
    },
    warn() {
      formatAndReport(formatter, reporters, { ...diagnostic, level: 'warn' as const })
    },
    error() {
      formatAndReport(formatter, reporters, { ...diagnostic, level: 'error' as const })
    },
    log() {
      formatAndReport(formatter, reporters, diagnostic)
    },
    format() {
      return formatter(diagnostic)
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
    formatAndReport(formatter, reporters, diagnostic)
    throw new CodedError(diagnostic)
  }
  result.warn = (diagnostic: Diagnostic): void => {
    formatAndReport(formatter, reporters, { ...diagnostic, level: 'warn' as const })
  }
  result.error = (diagnostic: Diagnostic): void => {
    formatAndReport(formatter, reporters, { ...diagnostic, level: 'error' as const })
  }
  result.log = (diagnostic: Diagnostic): void => {
    formatAndReport(formatter, reporters, diagnostic)
  }
  result.format = (diagnostic: Diagnostic): string => {
    return formatter(diagnostic)
  }

  return result as Logger<D>
}
