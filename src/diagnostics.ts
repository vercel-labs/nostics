import type { ExtractParams, IsEmptyObject, Simplify } from './utils'

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

export type CodeFactory<T>
  = IsEmptyObject<ExtractParams<T>> extends true
    ? (overrides?: Overrides) => Diagnostic
    : (params: Simplify<ExtractParams<T>>, overrides?: Overrides) => Diagnostic

export interface DiagnosticsMethods<C extends Record<string, DiagnosticDefinition>> {
  codes: () => (keyof C & string)[]
  has: (code: string) => code is Extract<keyof C, string>
  get: <K extends keyof C>(code: K) => C[K]
  extend: <U extends Record<string, DiagnosticDefinition>>(defs: U) => DiagnosticsResult<C & U>
}

export type DiagnosticsResult<C extends Record<string, DiagnosticDefinition>> = {
  [K in keyof C]: CodeFactory<C[K]>
} & DiagnosticsMethods<C>

export interface DefineDiagnosticsOptions<C extends Record<string, DiagnosticDefinition>> {
  docsBase?: string | ((code: string) => string | undefined)
  codes: C
}

function resolveTemplate(template: MessageTemplate | undefined, params: any): string | undefined {
  if (template == null)
    return undefined
  if (typeof template === 'function')
    return template(params)
  return template
}

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
