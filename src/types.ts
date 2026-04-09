export type DiagnosticLevel = 'error' | 'warn' | 'suggestion' | 'deprecation'

export interface SourceLocation {
  file?: string
  line?: number
  column?: number
}

export interface Diagnostic {
  code: string
  level: DiagnosticLevel
  message: string
  why?: string
  fix?: string
  hint?: string
  docs?: string
  sources?: SourceLocation[]
  cause?: unknown
  context?: Record<string, unknown>
}

export type Overrides = Partial<Pick<Diagnostic, 'level' | 'sources' | 'cause' | 'context'>>

export type MessageTemplate<P = any> = string | ((params: P) => string)

export interface DiagnosticDefinition {
  message: MessageTemplate
  fix?: MessageTemplate
  why?: MessageTemplate
  hint?: MessageTemplate
  level?: DiagnosticLevel
}

export interface Formatter {
  format: (diagnostic: Diagnostic) => string
}

export interface Reporter {
  report: (diagnostic: Diagnostic, formatted: string) => void
}

export interface DiagnosticActions extends Diagnostic {
  throw: () => never
  warn: () => void
  error: () => void
  log: () => void
  format: () => string
}

// Type utilities for extracting params from template fields

type Simplify<T> = { [K in keyof T]: T[K] } & {}

type ExtractFieldParams<T> = T extends (params: infer P) => string ? P : Record<never, never>

type ExtractParams<T>
  = & (T extends { message: infer M } ? ExtractFieldParams<M> : Record<never, never>)
    & (T extends { fix: infer F } ? ExtractFieldParams<F> : Record<never, never>)
    & (T extends { why: infer W } ? ExtractFieldParams<W> : Record<never, never>)
    & (T extends { hint: infer H } ? ExtractFieldParams<H> : Record<never, never>)

type IsEmptyObject<T> = keyof T extends never ? true : false

export type CodeFactory<T>
  = IsEmptyObject<ExtractParams<T>> extends true
    ? (overrides?: Overrides) => Diagnostic
    : (params: Simplify<ExtractParams<T>>, overrides?: Overrides) => Diagnostic

export interface DiagnosticsMethods<C> {
  codes: () => (keyof C & string)[]
  has: (code: string) => boolean
  get: <K extends keyof C>(code: K) => C[K]
  extend: <U extends Record<string, DiagnosticDefinition>>(defs: U) => DiagnosticsResult<C & U>
}

export type DiagnosticsResult<C> = {
  [K in keyof C]: CodeFactory<C[K]>
} & DiagnosticsMethods<C>

export interface DefineDiagnosticsOptions<C extends Record<string, DiagnosticDefinition>> {
  docsBase?: string
  codes: C
}

// Logger types

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
  reporter?: Reporter
}
