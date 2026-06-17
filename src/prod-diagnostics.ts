import type {
  AnyDiagnosticReporter,
  DiagnosticCallParams,
  DiagnosticDefinition,
  Diagnostics,
} from './diagnostic'
import { deriveDocs, Diagnostic } from './diagnostic'

/**
 * Options for {@link defineProdDiagnostics}. A lean subset of
 * {@link DefineDiagnosticsOptions}: no `codes` map (the proxy serves any code),
 * only what is needed to keep behaviour correct in production.
 */
export interface DefineProdDiagnosticsOptions<
  Reporters extends readonly AnyDiagnosticReporter[] = readonly AnyDiagnosticReporter[],
> {
  /**
   * Base URL or resolver for documentation links, identical to
   * {@link DefineDiagnosticsOptions.docsBase}. The docs URL is derived from the
   * accessed code at call time, so links survive even without the catalog.
   */
  docsBase?: string | ((code: string) => string | undefined)

  /**
   * Reporters called every time a diagnostic is produced. Omitted by default in
   * production builds; the strip plugin can copy them into the prod branch when
   * prod-time reporting (e.g. telemetry) is desired.
   */
  reporters?: Reporters
}

/**
 * Production counterpart to {@link defineDiagnostics}. Returns a `Proxy` that
 * builds a minimal {@link Diagnostic} for any accessed code: the code becomes
 * the `message` (`why`), `name` stays the default `'Diagnostic'`, and `docs` is
 * derived from `docsBase`. It carries no catalog text, so it stays tiny in a
 * bundle.
 *
 * The strip plugin (`@nostics/unplugin`) can rewrite a `defineDiagnostics()`
 * call into a `process.env.NODE_ENV === 'production'` ternary that selects this
 * factory in production, dropping every `why`/`fix` string from the bundle.
 *
 * @example
 * ```ts
 * const diagnostics = defineProdDiagnostics({ docsBase: 'https://docs.example.com' })
 * throw diagnostics.NUXT_B2011() // Error: NUXT_B2011, docs derived from docsBase
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export function defineProdDiagnostics<
  const Codes extends Record<string, DiagnosticDefinition> = Record<string, DiagnosticDefinition>,
  const Reporters extends readonly AnyDiagnosticReporter[] = readonly AnyDiagnosticReporter[],
>(options: DefineProdDiagnosticsOptions<Reporters> = {}): Diagnostics<Codes, Reporters> {
  const { docsBase, reporters = [] } = options

  return new Proxy({} as Diagnostics<Codes, Reporters>, {
    get(_target, code) {
      // ignore symbol / non-string probes (e.g. `then`, `Symbol.toPrimitive`)
      if (typeof code !== 'string')
        return undefined

      const handle = (
        params: DiagnosticCallParams & Record<string, unknown> = {},
        reporterOptions: any = {},
      ): Diagnostic => {
        const diagnostic = new Diagnostic(
          {
            why: code,
            docs: deriveDocs(docsBase, code),
            cause: params.cause,
            sources: params.sources,
          },
          handle,
        )
        for (const reporter of reporters) reporter(diagnostic, reporterOptions)
        return diagnostic
      }

      return handle
    },
  })
}
