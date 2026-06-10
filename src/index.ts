export { createReporterLog, defineDiagnostics, Diagnostic, reporterLog } from './diagnostic'

export type {
  ConsoleMethod,
  DefineDiagnosticsOptions,
  DiagnosticCallParams,
  DiagnosticDefinition,
  DiagnosticHandle,
  DiagnosticInit,
  DiagnosticReporter,
  ReporterLogOptions,
} from './diagnostic'

export { formatDiagnostic } from './formatters/plain'

export type { ValueOrFn as _ValueOrFn } from './utils'
