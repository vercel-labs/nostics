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
  reporters?: Reporter | Reporter[]
  captureStack?: boolean
}

function captureStackTrace(): string | undefined {
  const err: { stack?: string } = {}
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(err, captureStackTrace)
  }
  else {
    // eslint-disable-next-line unicorn/error-message -- only used for stack capture
    err.stack = new Error().stack
  }
  if (!err.stack)
    return undefined

  const lines = err.stack.split('\n')

  // Find where "at " frames begin (skip "Error" header)
  let frameStart = 0
  while (frameStart < lines.length && !lines[frameStart].trimStart().startsWith('at ')) {
    frameStart++
  }

  // V8 captureStackTrace already strips captureStackTrace itself,
  // fallback needs to skip captureStackTrace + the action method (2 frames)
  const skipInternal = typeof Error.captureStackTrace === 'function' ? 1 : 2

  const frames = lines
    .slice(frameStart + skipInternal)
    .filter(line => !line.includes('/node_modules/') && !line.includes('(node:'))
    .map(line => line.trim())

  return frames.length > 0 ? frames.join('\n') : undefined
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
  shouldCaptureStack: boolean,
): DiagnosticActions {
  return Object.assign({}, diagnostic, {
    throw(): never {
      const stack = shouldCaptureStack ? captureStackTrace() : undefined
      const d = stack ? { ...diagnostic, stack } : diagnostic
      formatAndReport(formatter, reporters, d)
      throw new CodedError(d)
    },
    warn() {
      const stack = shouldCaptureStack ? captureStackTrace() : undefined
      formatAndReport(formatter, reporters, { ...diagnostic, level: 'warn' as const, ...(stack && { stack }) })
    },
    error() {
      const stack = shouldCaptureStack ? captureStackTrace() : undefined
      formatAndReport(formatter, reporters, { ...diagnostic, level: 'error' as const, ...(stack && { stack }) })
    },
    log() {
      const stack = shouldCaptureStack ? captureStackTrace() : undefined
      const d = stack ? { ...diagnostic, stack } : diagnostic
      formatAndReport(formatter, reporters, d)
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
  const reporters = Array.isArray(options.reporters)
    ? options.reporters
    : [options.reporters ?? consoleReporter]
  const shouldCaptureStack = options.captureStack !== false

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
          return createActions(diagnostic, formatter, reporters, shouldCaptureStack)
        }
      }
    }
  }

  // Raw logger methods
  result.throw = (diagnostic: Diagnostic): never => {
    const stack = shouldCaptureStack ? captureStackTrace() : undefined
    const d = stack ? { ...diagnostic, stack } : diagnostic
    formatAndReport(formatter, reporters, d)
    throw new CodedError(d)
  }
  result.warn = (diagnostic: Diagnostic): void => {
    const stack = shouldCaptureStack ? captureStackTrace() : undefined
    formatAndReport(formatter, reporters, { ...diagnostic, level: 'warn' as const, ...(stack && { stack }) })
  }
  result.error = (diagnostic: Diagnostic): void => {
    const stack = shouldCaptureStack ? captureStackTrace() : undefined
    formatAndReport(formatter, reporters, { ...diagnostic, level: 'error' as const, ...(stack && { stack }) })
  }
  result.log = (diagnostic: Diagnostic): void => {
    const stack = shouldCaptureStack ? captureStackTrace() : undefined
    const d = stack ? { ...diagnostic, stack } : diagnostic
    formatAndReport(formatter, reporters, d)
  }
  result.format = (diagnostic: Diagnostic): string => {
    return formatter(diagnostic)
  }

  return result as Logger<D>
}
