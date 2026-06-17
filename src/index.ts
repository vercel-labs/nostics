export { createConsoleReporter, defineDiagnostics, Diagnostic } from './diagnostic'

export type {
  ConsoleMethod,
  ConsoleReporterOptions,
  DefineDiagnosticsOptions,
  DiagnosticCallParams,
  DiagnosticDefinition,
  DiagnosticHandle,
  DiagnosticInit,
  DiagnosticReporter,
  Diagnostics,
} from './diagnostic'

export { formatDiagnostic } from './formatters/plain'

export { defineProdDiagnostics } from './prod-diagnostics'

export type { DefineProdDiagnosticsOptions } from './prod-diagnostics'

export type { ValueOrFn as _ValueOrFn } from './utils'
