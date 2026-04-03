import type { DefineDiagnosticsOptions, Diagnostic, DiagnosticDefinition, DiagnosticsResult, MessageTemplate, Overrides } from './types'

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
  const { prefix, docsBase, codes } = options

  const result = {} as any

  for (const code of Object.keys(codes)) {
    const def = codes[code]
    result[code] = (paramsOrOverrides?: any, maybeOverrides?: Overrides): Diagnostic => {
      // Determine if first arg is params or overrides
      const hasParams = typeof def.message === 'function'
        || typeof def.fix === 'function'
        || typeof def.why === 'function'
        || typeof def.hint === 'function'

      const params = hasParams ? paramsOrOverrides : undefined
      const overrides = hasParams ? maybeOverrides : paramsOrOverrides as Overrides | undefined

      const diagnostic: Diagnostic = {
        code,
        level: def.level ?? 'error',
        message: resolveTemplate(def.message, params)!,
        ...(prefix != null && { prefix }),
        ...(docsBase != null && { docs: `${docsBase}/${code.toLowerCase()}` }),
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
      value: () => Object.keys(codes),
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
