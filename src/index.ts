export { createConsoleReporter, defineDiagnostics, Diagnostic, reporterLog } from './diagnostic'

export type {
  ConsoleMethod,
  ConsoleReporterOptions,
  DefineDiagnosticsOptions,
  DiagnosticCallParams,
  DiagnosticDefinition,
  DiagnosticHandle,
  DiagnosticInit,
  DiagnosticReporter,
} from './diagnostic'

export { formatDiagnostic } from './formatters/plain'

export type { ValueOrFn as _ValueOrFn } from './utils'
