import type { ExtractParams, IsEmptyObject, Simplify } from './utils'

/**
 * Severity level of a diagnostic. Controls console routing and formatter styling.
 */
export type DiagnosticLevel = 'error' | 'warn' | 'suggestion' | 'deprecation'

/**
 * Source location in user code. Use the `file:line:column` string convention
 * when a simpler representation suffices.
 */
export interface SourceLocation {
  file?: string
  line?: number
  column?: number
}

/**
 * A structured, serializable diagnostic object with a stable code.
 */
export interface Diagnostic {
  /**
   * Unique, stable identifier for this diagnostic (e.g. `MATH_E001`).
   */
  code: string
  /**
   * Severity level. Defaults to `'error'` when not specified in the definition.
   */
  level: DiagnosticLevel
  /**
   * Human-readable description of the problem.
   */
  message: string
  /**
   * Explains *why* this is a problem — the root cause or rationale.
   */
  why?: string
  /**
   * Actionable instructions on how to resolve the problem.
   */
  fix?: string
  /**
   * Lighter guidance or pointers — additional context that may help.
   */
  hint?: string
  /**
   * URL to extended documentation for this diagnostic code.
   * Auto-generated from {@link DefineDiagnosticsOptions.docsBase}.
   */
  docs?: string
  /**
   * Relevant source locations in user code associated with this diagnostic.
   */
  sources?: SourceLocation[]
  /**
   * Original error or exception that triggered this diagnostic.
   * Propagated to {@link CodedError.cause} when throwing.
   */
  cause?: unknown
  /**
   * Arbitrary key-value metadata for machine consumers (reporters, telemetry).
   * Not rendered by formatters.
   */
  context?: Record<string, unknown>
  /**
   * Call stack captured by the logger at the call site.
   * Auto-populated by action methods (`.warn()`, `.error()`, `.throw()`, `.log()`).
   */
  stack?: string
}

/**
 * Fields that can be overridden per-call when invoking a diagnostic factory.
 */
export type Overrides = Partial<Pick<Diagnostic, 'level' | 'sources' | 'cause' | 'context'>>

/**
 * A template for a diagnostic text field — either a static string or a function
 * that receives interpolation parameters and returns a string.
 */
export type MessageTemplate<P = any> = string | ((params: P) => string)

/**
 * Schema for a single diagnostic code within {@link defineDiagnostics}.
 */
export interface DiagnosticDefinition {
  /**
   * Message template. If a function, receives typed params for interpolation.
   */
  message: MessageTemplate
  /**
   * Fix template. Describes how to resolve the problem.
   */
  fix?: MessageTemplate
  /**
   * Why template. Explains the root cause or rationale.
   */
  why?: MessageTemplate
  /**
   * Hint template. Provides additional guidance.
   */
  hint?: MessageTemplate
  /**
   * Default severity for this code. Defaults to `'error'` if omitted.
   */
  level?: DiagnosticLevel
}

/**
 * Callable factory for a single diagnostic code. When the definition uses template
 * functions, the first argument is the interpolation params object; otherwise
 * the only (optional) argument is {@link Overrides}.
 */
export type CodeFactory<T>
  = IsEmptyObject<ExtractParams<T>> extends true
    ? (overrides?: Overrides) => Diagnostic
    : (params: Simplify<ExtractParams<T>>, overrides?: Overrides) => Diagnostic

/**
 * Utility methods available on every {@link DiagnosticsResult}.
 */
export interface DiagnosticsMethods<C extends Record<string, DiagnosticDefinition>> {
  /**
   * Returns all registered diagnostic code strings.
   */
  codes: () => (keyof C & string)[]
  /**
   * Type-guard that checks whether `code` is a registered diagnostic code.
   */
  has: (code: string) => code is Extract<keyof C, string>
  /**
   * Returns the raw {@link DiagnosticDefinition} for a given code.
   */
  get: <K extends keyof C>(code: K) => C[K]
  /**
   * Creates a new diagnostics object that includes both the current codes
   * and the provided additional definitions.
   */
  extend: <U extends Record<string, DiagnosticDefinition>>(defs: U) => DiagnosticsResult<C & U>
}

/**
 * The return type of {@link defineDiagnostics} — an object whose keys are diagnostic
 * codes (each a {@link CodeFactory}) plus {@link DiagnosticsMethods} for introspection.
 */
export type DiagnosticsResult<C extends Record<string, DiagnosticDefinition>> = {
  [K in keyof C]: CodeFactory<C[K]>
} & DiagnosticsMethods<C>

/**
 * Options for {@link defineDiagnostics}.
 */
export interface DefineDiagnosticsOptions<C extends Record<string, DiagnosticDefinition>> {
  /**
   * Base URL or resolver for documentation links. When a string, the code is
   * appended as a lowercase path segment (e.g. `"https://docs.example.com"` →
   * `"https://docs.example.com/math_e001"`). When a function, receives the code
   * and returns a URL or `undefined`.
   */
  docsBase?: string | ((code: string) => string | undefined)
  /**
   * Map of diagnostic codes to their definitions.
   */
  codes: C
}

/**
 * Resolves a {@link MessageTemplate} into a string, or `undefined` if the template is absent.
 */
function resolveTemplate(template: MessageTemplate | undefined, params: any): string | undefined {
  if (template == null)
    return undefined
  if (typeof template === 'function')
    return template(params)
  return template
}

/**
 * Creates a typed diagnostics object from a set of code definitions. Each code
 * becomes a callable factory that produces {@link Diagnostic} objects with
 * template interpolation and optional per-call overrides.
 */
export function defineDiagnostics<C extends Record<string, DiagnosticDefinition>>(
  options: DefineDiagnosticsOptions<C>,
): DiagnosticsResult<C> {
  const { docsBase, codes } = options

  const result = {} as any
  const codeKeys = Object.keys(codes)

  for (const code of codeKeys) {
    const def = codes[code]
    result[code] = (paramsOrOverrides?: any, maybeOverrides?: Overrides): Diagnostic => {
      // Determine if first arg is params or overrides
      const hasParams = typeof def.message === 'function'
        || typeof def.fix === 'function'
        || typeof def.why === 'function'
        || typeof def.hint === 'function'

      const params = hasParams ? paramsOrOverrides : undefined
      const overrides = hasParams ? maybeOverrides : paramsOrOverrides as Overrides | undefined

      const docs = typeof docsBase === 'function'
        ? docsBase(code)
        : docsBase != null
          ? `${docsBase}/${code.toLowerCase()}`
          : undefined

      const diagnostic: Diagnostic = {
        code,
        level: def.level ?? 'error',
        message: resolveTemplate(def.message, params)!,
        ...(docs != null && { docs }),
        ...resolveTemplate(def.fix, params) != null && { fix: resolveTemplate(def.fix, params) },
        ...resolveTemplate(def.why, params) != null && { why: resolveTemplate(def.why, params) },
        ...resolveTemplate(def.hint, params) != null && { hint: resolveTemplate(def.hint, params) },
        ...overrides,
      }

      return diagnostic
    }
  }

  Object.defineProperties(result, {
    codes: {
      value: () => codeKeys,
      enumerable: false,
    },
    has: {
      value: (code: string) => code in codes,
      enumerable: false,
    },
    get: {
      value: (code: string) => codes[code],
      enumerable: false,
    },
    extend: {
      value: <U extends Record<string, DiagnosticDefinition>>(defs: U) =>
        defineDiagnostics({ ...options, codes: { ...codes, ...defs } as any }),
      enumerable: false,
    },
  })

  return result as DiagnosticsResult<C>
}
