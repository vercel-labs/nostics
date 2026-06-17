/* eslint-disable ts/no-empty-object-type -- `{}` is used as the neutral element when intersecting reporter option shapes */
/* eslint-disable ts/no-unsafe-function-type -- used by captureStackTrace */

import type { ExtractFnParam, IsUnknown, Prettify, UnionToIntersection, ValueOrFn } from './utils'
import { formatDiagnostic } from './formatters/plain'
import { toValueWithArgs } from './utils'

/**
 * Define-time shape of a diagnostic. Each field can be a static value or a
 * function that resolves it from a shared `params` object passed at call
 * time. Runtime-only fields (`cause`, `sources`) from {@link DiagnosticInit}
 * are intentionally omitted: they're only meaningful at the call site.
 */
export interface DiagnosticDefinition<P = any> {
  /**
   * The error message: why this failed. String, or a function of `params`.
   *
   * @example
   * ```ts
   * why: (p: { name: string }) => `module "${p.name}" failed to load`
   * ```
   */
  why: ValueOrFn<string, P>

  /**
   * Actionable instructions on how to resolve the problem. String, or a
   * function of `params`.
   *
   * @example
   * ```ts
   * fix: (p: { name: string }) => `run "npm install ${p.name}"`
   * ```
   */
  fix?: ValueOrFn<string, P>

  /**
   * Per-code docs URL. A string overrides
   * {@link DefineDiagnosticsOptions.docsBase} for this code; `false` opts this
   * code out entirely, even when `docsBase` is set. When omitted, the URL is
   * derived from `docsBase`.
   */
  docs?: string | false
}

/**
 * Runtime-only fields that can be passed alongside the interpolation params
 * at call time. Merged into the same object so callers pass everything in
 * one place.
 */
export interface DiagnosticCallParams {
  /**
   * Original error or exception that triggered this diagnostic. Pass it
   * through when re-throwing so the original stack trace is preserved.
   */
  cause?: unknown

  /**
   * Locations in user code that contributed to this diagnostic, in
   * `file:line:column` format. Useful for compilers and other tools where the
   * JS stack trace doesn't reflect the user's source.
   */
  sources?: string[]
}

/**
 * Structured initializer for a {@link Diagnostic}. `why` is the only required
 * field: it becomes the {@link Diagnostic.message}. The remaining fields are
 * optional metadata that reporters and consumers can render or forward.
 */
export interface DiagnosticInit extends DiagnosticCallParams {
  /**
   * The actual error message: why this failed.
   * Mirrored to `Error.message`.
   */
  why: string

  /**
   * Optional actionable instructions on how to resolve the problem.
   */
  fix?: string

  /**
   * URL to extended documentation for this diagnostic.
   */
  docs?: string
}

/**
 * Represents how to report a diagnostic. Could call `console.log()`, send the
 * diagnostic to a server, or something else. Reporters declare the shape of
 * options they need via `ReporterOpts`; `defineDiagnostics` intersects every
 * reporter's options into a single object passed at the call site.
 */
export type DiagnosticReporter<ReporterOpts extends object = {}> = (
  diagnostic: Diagnostic,
  options: ReporterOpts,
) => void

/**
 * Permissive reporter constraint used internally so reporters with 1 arg,
 * required options, or optional options all satisfy the array constraint.
 *
 * @internal
 */
export type AnyDiagnosticReporter = (diagnostic: Diagnostic, options: any) => void

/**
 * The `console` methods a log reporter can route to.
 */
export type ConsoleMethod = 'log' | 'error' | 'warn'

/**
 * Options for {@link createConsoleReporter}.
 */
export interface ConsoleReporterOptions {
  /**
   * `console` method used to print the diagnostic. Defaults to `'warn'`. The
   * returned reporter still accepts a per-call `{ method }` override through
   * the call-site reporter options.
   */
  method?: ConsoleMethod

  /**
   * Renders the diagnostic into the string handed to `console`. Defaults to
   * {@link formatDiagnostic}, the plain unicode-decorated formatter.
   */
  formatter?: (diagnostic: Diagnostic) => string
}

/**
 * Creates a console reporter that renders each diagnostic with `formatter` and
 * prints the result via `console[method]`. Both default sensibly (`'warn'` and
 * {@link formatDiagnostic}); `method` can also be overridden per call through
 * the reporter options.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createConsoleReporter({
  method: defaultMethod = 'warn',
  formatter = formatDiagnostic,
}: ConsoleReporterOptions = {}): DiagnosticReporter<{ method?: ConsoleMethod }> {
  return (diagnostic, { method = defaultMethod } = {}) => {
    // eslint-disable-next-line no-console
    console[method](formatter(diagnostic))
  }
}

/**
 * Resolves the `params` type a code expects from the intersection of params
 * across all function-typed fields, falling back to `{}` when every field is
 * static. Merged with {@link DiagnosticCallParams} at the call site.
 *
 * @internal
 */
type InferCodeParams<Def> = [ExtractFnParam<Def[keyof Def]>] extends [never]
  ? {}
  : UnionToIntersection<ExtractFnParam<Def[keyof Def]>>

/**
 * Options for {@link defineDiagnostics}.
 */
export interface DefineDiagnosticsOptions<
  Codes extends Record<string, DiagnosticDefinition>,
  Reporters extends readonly AnyDiagnosticReporter[],
> {
  /**
   * Base URL or resolver for documentation links. When a string, the code is
   * appended as a lowercase path segment (e.g. `"https://docs.example.com"` →
   * `"https://docs.example.com/math_e001"`). When a function, receives the
   * code and returns a URL or `undefined`.
   */
  docsBase?: string | ((code: keyof Codes) => string | undefined)

  /**
   * Map of diagnostic codes to their definitions.
   */
  codes: Codes

  /**
   * Reporters called every time a diagnostic is produced. Can be used to
   * integrate with custom logging.
   */
  reporters?: Reporters
}

/**
 * The first positional argument of a {@link DiagnosticHandle} call:
 * interpolation params merged with the runtime-only call-site fields
 * (`cause`, `sources`).
 *
 * @internal
 */
type CallSiteParams<Params> = Params & DiagnosticCallParams

/**
 * Resolves the full argument tuple for a {@link DiagnosticHandle} call.
 * Branches on whether params and reporter options each have required fields.
 * Required positions become required tuple elements, all-optional ones
 * become `?`, and when no reporter declares any options the parameter is
 * omitted entirely.
 *
 * @internal
 */
type ActionArgs<Params, ReporterOpts> = keyof ReporterOpts extends never
  ? {} extends Params
      ? [params?: CallSiteParams<Params>]
      : [params: CallSiteParams<Params>]
  : {} extends ReporterOpts
      ? {} extends Params
          ? [params?: CallSiteParams<Params>, reporterOptions?: ReporterOpts]
          : [params: CallSiteParams<Params>, reporterOptions?: ReporterOpts]
      : {} extends Params
          ? [params: CallSiteParams<Params> | undefined, reporterOptions: ReporterOpts]
          : [params: CallSiteParams<Params>, reporterOptions: ReporterOpts]

/**
 * Per-code handle exposed by {@link defineDiagnostics}. Each code is a
 * callable: invoke it to build the diagnostic and run every reporter, or
 * prefix the call with `throw` to raise it.
 *
 * @example
 * ```ts
 * diagnostics.MATH_E001({ name: 'x' })           // report
 * throw diagnostics.MATH_E001({ name: 'x' })     // throw
 * ```
 */
export interface DiagnosticHandle<Params, ReporterOpts> {
  /**
   * Builds the diagnostic, runs every reporter, and returns the diagnostic
   * instance. The returned diagnostic can be inspected, attached as `cause`,
   * or thrown with `throw`.
   */
  (...args: ActionArgs<Params, ReporterOpts>): Diagnostic
}

/**
 * Return type of {@link defineDiagnostics}.
 *
 * @internal
 */
export type Diagnostics<
  Codes extends Record<string, DiagnosticDefinition>,
  Reporters extends readonly AnyDiagnosticReporter[],
> = {
  [Code in keyof Codes]: DiagnosticHandle<
    InferCodeParams<Codes[Code]>,
    Prettify<ExtractReportersOptions<Reporters>>
  >
}

const captureStackTrace = (
  Error as { captureStackTrace?: (target: object, frame: Function) => void }
).captureStackTrace

export class Diagnostic extends Error {
  name: string = 'Diagnostic'

  /**
   * URL to extended documentation for this diagnostic code.
   * Auto-generated from {@link DefineDiagnosticsOptions.docsBase}.
   */
  docs?: string

  /**
   * Optional actionable instructions on how to resolve the problem.
   */
  fix?: string

  /**
   * Locations in user code that contributed to this diagnostic, in
   * `file:line:column` format. Relevant when the stack trace doesn't reflect
   * the user's source (e.g. compilers, bundlers), otherwise redundant with the
   * stack and should be omitted.
   */
  sources?: string[]

  /**
   * Alias for {@link Error.message}: the reason this diagnostic was raised.
   */
  get why(): string {
    return this.message
  }

  /**
   * @param init        structured initializer; `why` is required
   * @param captureFrom V8 stack-cutoff frame. Defaults to {@link Diagnostic}
   * so the top of the trace is the `new Diagnostic(...)` call site.
   * `defineDiagnostics` passes its action method to strip its own frames too.
   * Ignored on engines without `Error.captureStackTrace`.
   */
  constructor(init: DiagnosticInit, captureFrom: Function = Diagnostic) {
    super(init.why, { cause: init.cause })
    this.fix = init.fix
    this.docs = init.docs
    this.sources = init.sources
    // V8-only API, but also implemented pretty much everywhere. Worst case
    // scenario, we fall back to the stack `Error` captures by default, which
    // includes a couple of extra internal frames but is still usable.
    captureStackTrace?.(this, captureFrom)
  }

  /**
   * Converts the diagnostic into a serializable structured object.
   */
  toJSON(): object {
    return {
      name: this.name,
      why: this.why,
      fix: this.fix,
      docs: this.docs,
      sources: this.sources,
      cause: this.cause,
      stack: this.stack,
    }
  }
}

/**
 * Resolves the docs URL for a code from a `docsBase` (string template or
 * resolver function). Shared by {@link defineDiagnostics} and
 * {@link defineProdDiagnostics}. Per-code `docs` overrides are handled by the
 * caller; this only covers the `docsBase`-derived case.
 *
 * @internal
 */
export function deriveDocs(
  docsBase: string | ((code: any) => string | undefined) | undefined,
  code: string,
): string | undefined {
  return typeof docsBase === 'string' ? `${docsBase}/${code.toLowerCase()}` : docsBase?.(code)
}

/**
 * Creates a typed diagnostics object from a set of code definitions. Each
 * code becomes a callable {@link DiagnosticHandle}: invoke to report, or
 * `throw` the result to raise. No `new` required, no proxy.
 */
/* @__NO_SIDE_EFFECTS__ */
export function defineDiagnostics<
  const Codes extends Record<string, DiagnosticDefinition>,
  const Reporters extends readonly AnyDiagnosticReporter[],
>(options: DefineDiagnosticsOptions<Codes, Reporters>): Diagnostics<Codes, Reporters> {
  const reporters = options.reporters ?? []
  const result = {} as Diagnostics<Codes, Reporters>

  const { docsBase } = options

  for (const code of Object.keys(options.codes) as Extract<keyof Codes, string>[]) {
    const def = options.codes[code]
    // skip docs if set to false, otherwise use it or derive it from docsBase
    const docs = def.docs === false ? undefined : def.docs || deriveDocs(docsBase, code)

    const handle = (
      params: DiagnosticCallParams & Record<string, unknown> = {},
      reporterOptions: any = {},
    ): Diagnostic => {
      const diagnostic = new Diagnostic(
        {
          why: toValueWithArgs(def.why, params),
          fix: toValueWithArgs(def.fix, params),
          docs,
          cause: params.cause,
          sources: params.sources,
        },
        handle,
      )
      diagnostic.name = code
      for (const reporter of reporters) reporter(diagnostic, reporterOptions)
      return diagnostic
    }

    result[code] = handle as unknown as Diagnostics<Codes, Reporters>[typeof code]
  }

  return result
}

/**
 * Extracts the options object a reporter accepts as its 2nd argument. Returns
 * `{}` when the reporter has no 2nd arg (so it contributes nothing to the
 * merged shape).
 */
type ExtractSingleReporterOptions<Reporter> = Reporter extends (
  diagnostic: Diagnostic,
  options: infer ReporterOpts,
) => any
  ? IsUnknown<ReporterOpts> extends true
    ? {}
    : Exclude<ReporterOpts, undefined>
  : {}

/**
 * Intersects every reporter's options shape into a single object. If any
 * reporter has a required field, the merged shape has a required field, and
 * {@link ActionArgs} flips `reporterOptions` from optional to required via
 * `{} extends Merged`.
 */
type ExtractReportersOptions<Reporters extends readonly any[]> = Reporters extends readonly [
  infer First,
  ...infer Rest,
]
  ? ExtractSingleReporterOptions<First> & ExtractReportersOptions<Rest>
  : {}
