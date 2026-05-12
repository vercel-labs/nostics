/* eslint-disable ts/no-empty-object-type -- `{}` is used as the neutral element when intersecting reporter option shapes */
/* eslint-disable ts/no-unsafe-function-type -- used by captureStackTrace */

import type { ExtractFnParam, IsUnknown, Prettify, UnionToIntersection, ValueOrFn } from './utils'
import { toValueWithArgs } from './utils'

/**
 * Define-time shape of a diagnostic. Each field can be a static value or a
 * function that resolves it from a shared `params` object passed at
 * `.report()` / `.throw()` time. The runtime-only `cause` field from
 * {@link DiagnosticInit} is intentionally omitted.
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
   * fix: (p: { name: string }) => `run \`npm install ${p.name}\``
   * ```
   */
  fix?: ValueOrFn<string, P>

  /**
   * Locations in user code that contributed to this diagnostic, in
   * `file:line:column` format. Array, or a function of `params`.
   *
   * @example
   * ```ts
   * sources: (p: { file: string }) => [`${p.file}:1:1`]
   * ```
   */
  sources?: ValueOrFn<string[], P>
}

/**
 * Structured initializer for a {@link Diagnostic}. `why` is the only required
 * field — it becomes the {@link Error.message}. The remaining fields are
 * optional metadata that reporters and consumers can render or forward.
 */
export interface DiagnosticInit {
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
 * Represents how to report a diagnostic. Could call `console.log()`, send the
 * diagnostic to a server, or something else. Reporters declare the shape of
 * options they need via `Opts`; `defineDiagnostics` intersects every
 * reporter's options into a single object passed at the call site.
 */
export type DiagnosticReporter<Opts extends object = {}> = (
  diagnostic: Diagnostic,
  options: Opts,
) => void

/**
 * Permissive reporter constraint used internally so reporters with 1 arg,
 * required options, or optional options all satisfy the array constraint.
 *
 * @internal
 */
type AnyDiagnosticReporter = (diagnostic: Diagnostic, options: any) => void

export function reporterError(diagnostic: Diagnostic): void {
  console.error(`Diagnostic: ${diagnostic.message}`)
}

export function reporterLog(
  diagnostic: Diagnostic,
  { method = 'log' }: { method?: 'log' | 'error' | 'warn' } = {},
): void {
  // eslint-disable-next-line no-console
  console[method](`Diagnostic: ${diagnostic.message}`)
}

export function reporterRequiredOptions(
  diagnostic: Diagnostic,
  options: { priority: number },
): void {
  console.warn(`Diagnostic: ${diagnostic.message} (priority: ${options.priority})`)
}

/**
 * Resolves the `params` type a code expects from the intersection of params
 * across all function-typed fields, falling back to `undefined` when every
 * field is static.
 *
 * @internal
 */
type InferCodeParams<Def> = [ExtractFnParam<Def[keyof Def]>] extends [never]
  ? undefined
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
   * Reporters called on `.report()` / `.throw()`. Can be used to integrate
   * with custom logging.
   */
  reporters?: Reporters
}

/**
 * Resolves the options portion of an action signature:
 * - merged shape has no keys → no options arg
 * - merged shape has only optional fields → optional `options?: Opts`
 * - merged shape has any required field → required `options: Opts`
 *
 * @internal
 */
type OptionsArgs<Opts> = keyof Opts extends never
  ? [arg?: undefined]
  : {} extends Opts
      ? [options?: Opts]
      : [options: Opts]

/**
 * Resolves the full argument tuple for `.report()` / `.throw()`:
 * - static-message codes (`Params = undefined`) → just the options tuple
 * - function-message codes → `[params, ...options]`
 *
 * @internal
 */
type ActionArgs<Params, Opts> = Params extends undefined
  ? OptionsArgs<Opts>
  : [params: Params, ...OptionsArgs<Opts>]

/**
 * Per-code handle exposed by {@link defineDiagnostics}. Each code is a plain
 * object with `.report()` and `.throw()`
 */
export interface DiagnosticHandle<Params, Opts> {
  /**
   * Builds the diagnostic, runs every reporter, and returns the diagnostic
   * instance. The returned diagnostic can be inspected, attached as `cause`,
   * or ignored.
   */
  report: (...args: ActionArgs<Params, Opts>) => Diagnostic

  /**
   * Builds the diagnostic, runs every reporter, then throws the diagnostic.
   */
  throw: (...args: ActionArgs<Params, Opts>) => never
}

/**
 * Return type of {@link defineDiagnostics}.
 */
type Diagnostics<
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
   * `file:line:column` format.
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
    this.sources = init.sources
    // V8-only API, but also implemented pretty much everywhere. Worst case
    // scenario, we fall back to the stack `Error` captures by default — which
    // includes a couple of extra internal frames but is still usable.
    captureStackTrace?.(this, captureFrom)
  }

  /**
   * Converts the diagnostic into a serializable structured object.
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      fix: this.fix,
      sources: this.sources,
      cause: this.cause,
      stack: this.stack,
    }
  }

  devOnly?: () => void
}

// NOTE: we could override properties at runtime for dev only stuff
if (process.env.NODE_ENV !== 'production') {
  Diagnostic.prototype.devOnly = function devOnly(this): void {
    // eslint-disable-next-line no-console
    console.log('This is a dev-only diagnostic')
  }
}

/**
 * Creates a typed diagnostics object from a set of code definitions. Each
 * code becomes a {@link DiagnosticHandle} with `.report()` / `.throw()` — no
 * `new` required, no proxy.
 */
export function defineDiagnostics<
  const Codes extends Record<string, DiagnosticDefinition>,
  const Reporters extends readonly AnyDiagnosticReporter[],
>(options: DefineDiagnosticsOptions<Codes, Reporters>): Diagnostics<Codes, Reporters> {
  const reporters = options.reporters ?? []
  const result = {} as Diagnostics<Codes, Reporters>

  for (const code of Object.keys(options.codes) as Extract<keyof Codes, string>[]) {
    const def = options.codes[code]
    // since reporter params go second, we need this to pass the correct args[]
    // in report
    const needsParams = [def.why, def.fix, def.sources].some(v => typeof v === 'function')

    const handle: Diagnostics<Codes, Reporters>[string] = {
      report(...args): Diagnostic {
        const params = needsParams ? args[0] : undefined
        const reporterOptions = (needsParams ? args[1] : args[0]) ?? {}
        const diagnostic = new Diagnostic(
          {
            why: toValueWithArgs(def.why, params),
            fix: toValueWithArgs(def.fix, params),
            sources: toValueWithArgs(def.sources, params),
          },
          handle.report,
        )
        diagnostic.name = code
        for (const reporter of reporters) reporter(diagnostic, reporterOptions)
        return diagnostic
      },
      throw(...args): never {
        throw this.report(...args)
      },
    }

    result[code] = handle
  }

  return result
}

export const errors = defineDiagnostics({
  docsBase: code => `https://example.com/docs/errors/${code.toLowerCase()}`,
  codes: {
    NUXT_B2011: {
      why: 'This is a bad example of an error code because it has no info',
    },
    NUXT_E032: {
      why: 'The server failed reload the configuration file.',
      fix: 'Manually restart the server.',
    },
    NUXT_E033: {
      why: (p: { moduleName: string }) =>
        `The module "${p.moduleName}" is not compatible with the current version of Nuxt.`,
      fix: 'Please check the module documentation for compatibility information.',
    },
  },
  reporters: [reporterLog],
})

/**
 * Extracts the options object a reporter accepts as its 2nd argument. Returns
 * `{}` when the reporter has no 2nd arg (so it contributes nothing to the
 * merged shape).
 */
type ExtractSingleReporterOptions<Reporter> = Reporter extends (
  diagnostic: Diagnostic,
  options: infer Opts,
) => any
  ? IsUnknown<Opts> extends true
    ? {}
    : Exclude<Opts, undefined>
  : {}

/**
 * Intersects every reporter's options shape into a single object. If any
 * reporter has a required field, the merged shape has a required field — and
 * {@link OptionsArgs} flips `options` from optional to required via
 * `{} extends Merged`.
 */
type ExtractReportersOptions<Reporters extends readonly any[]> = Reporters extends readonly [
  infer First,
  ...infer Rest,
]
  ? ExtractSingleReporterOptions<First> & ExtractReportersOptions<Rest>
  : {}
