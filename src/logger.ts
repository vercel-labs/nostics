import type { Diagnostic } from './diagnostics'
import type { Formatter } from './format'
import type { Reporter } from './reporter'
import { CodedError } from './error'
import { plainFormatter } from './format'
import { consoleReporter } from './reporter'

export interface DiagnosticActions extends Diagnostic {
  throw: () => never
  warn: () => void
  error: () => void
  log: () => void
  format: () => string
}

// Type utilities for extracting params from template fields

type ActionFactories<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => Diagnostic ? K : never]:
  T[K] extends (...args: infer A) => Diagnostic
    ? (...args: A) => DiagnosticActions
    : never
}

export type MergeFactories<D extends readonly any[]>
  = D extends readonly [infer First, ...infer Rest]
    ? ActionFactories<First> & MergeFactories<Rest>
    // eslint-disable-next-line ts/no-empty-object-type
    : {}

export interface LoggerMethods {
  throw: (diagnostic: Diagnostic) => never
  warn: (diagnostic: Diagnostic) => void
  error: (diagnostic: Diagnostic) => void
  log: (diagnostic: Diagnostic) => void
  format: (diagnostic: Diagnostic) => string
}

export type Logger<D extends readonly any[]> = MergeFactories<D> & LoggerMethods

export interface CreateLoggerOptions<D extends readonly any[]> {
  diagnostics: [...D]
  formatter?: Formatter
  reporter?: Reporter | Reporter[]
}

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
