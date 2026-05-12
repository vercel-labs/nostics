/* eslint-disable ts/no-empty-object-type -- `{}` is used as the neutral element when intersecting reporter option shapes */
/* eslint-disable ts/no-unsafe-function-type -- used by captureStackTrace */

/**
 * A template for a diagnostic text field — either a static string or a function
 * that receives interpolation parameters and returns a string.
 */
export type MessageTemplate<P = any> = string | ((params: P) => string)

/**
 * Structured initializer for a {@link Hint}. `why` is the only required field
 * — it becomes the {@link Error.message}. The remaining fields are optional
 * metadata that reporters and consumers can render or forward.
 */
export interface HintInit {
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
   * Original error or exception that triggered this hint. Pass it through
   * when re-throwing so the original stack trace is preserved.
   */
  cause?: unknown

  /**
   * Locations in user code that contributed to this hint, in `file:line:column`
   * format. Useful for compilers and other tools where the JS stack trace
   * doesn't reflect the user's source.
   */
  sources?: string[]
}

/**
 * Represents how to report a hint. Could call `console.log()`, send the hint
 * to a server, or something else. Reporters declare the shape of options they
 * need via `Opts`; `defineErrors` intersects every reporter's options into a
 * single object passed at the call site.
 */
export type HintReporter<Opts extends object = {}> = (hint: Hint, options: Opts) => void

/**
 * Permissive reporter constraint used internally so reporters with 1 arg,
 * required options, or optional options all satisfy the array constraint.
 *
 * @internal
 */
type AnyHintReporter = (hint: Hint, options: any) => void

export function reporterError(hint: Hint): void {
  console.error(`Hint: ${hint.message}`)
}

export function reporterLog(
  hint: Hint,
  { method = 'log' }: { method?: 'log' | 'error' | 'warn' } = {},
): void {
  // eslint-disable-next-line no-console
  console[method](`Hint: ${hint.message}`)
}

export function reporterRequiredOptions(hint: Hint, options: { priority: number }): void {
  console.warn(`Hint: ${hint.message} (priority: ${options.priority})`)
}

/**
 * Options for {@link defineErrors}.
 */
export interface DefineErrorsOptions<
  Codes extends Record<string, MessageTemplate | 0>,
  Reporters extends readonly AnyHintReporter[],
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

export interface DefineErrorsOptionsProd<Codes extends string[]> {
  /**
   * Base URL or resolver for documentation links. When a string, the code is
   * appended as a lowercase path segment (e.g. `"https://docs.example.com"` →
   * `"https://docs.example.com/math_e001"`). When a function, receives the
   * code and returns a URL or `undefined`.
   */
  docsBase?: string | ((code: Codes[number]) => string | undefined)

  /**
   * Map of diagnostic codes to their definitions.
   */
  codes: Codes
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
 * Per-code handle exposed by {@link defineErrors}. Each code is a plain
 * object with `.report()` and `.throw()`
 */
export interface HintHandle<Params, Opts> {
  /**
   * Builds the hint, runs every reporter, and returns the hint instance.
   * The returned hint can be inspected, attached as `cause`, or ignored.
   */
  report: (...args: ActionArgs<Params, Opts>) => Hint

  /**
   * Builds the hint, runs every reporter, then throws the hint.
   */
  throw: (...args: ActionArgs<Params, Opts>) => never
}

/**
 * Return type of {@link defineErrors}.
 */
type Errors<
  Codes extends Record<string, MessageTemplate | 0>,
  Reporters extends readonly AnyHintReporter[],
> = {
  [Code in keyof Codes]: HintHandle<
    Codes[Code] extends (params: infer P) => string ? P : undefined,
    Prettify<ExtractReportersOptions<Reporters>>
  >
}

const captureStackTrace = (
  Error as { captureStackTrace?: (target: object, frame: Function) => void }
).captureStackTrace

export class Hint extends Error {
  name: string = 'Hint'

  /**
   * URL to extended documentation for this diagnostic code.
   * Auto-generated from {@link DefineErrorsOptions.docsBase}.
   */
  docs?: string

  /**
   * Optional actionable instructions on how to resolve the problem.
   */
  fix?: string

  /**
   * Locations in user code that contributed to this hint, in
   * `file:line:column` format.
   */
  sources?: string[]

  /**
   * Alias for {@link Error.message}: the reason this hint was raised.
   */
  get why(): string {
    return this.message
  }

  /**
   * @param init        structured initializer; `why` is required
   * @param captureFrom V8 stack-cutoff frame. Defaults to {@link Hint} so the
   * top of the trace is the `new Hint(...)` call site. `defineErrors` passes
   * its action method to strip its own frames too. Ignored on engines without
   * `Error.captureStackTrace`.
   */
  constructor(init: HintInit, captureFrom: Function = Hint) {
    super(init.why, { cause: init.cause })
    this.fix = init.fix
    this.sources = init.sources
    // V8-only API, but also implemented pretty much everywhere. Worst case
    // scenario, we fall back to the stack `Error` captures by default — which
    // includes a couple of extra internal frames but is still usable.
    captureStackTrace?.(this, captureFrom)
  }

  /**
   * Converts the hint into a serializable structured object.
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
  Hint.prototype.devOnly = function devOnly(this): void {
    // eslint-disable-next-line no-console
    console.log('This is a dev-only hint')
  }
}

/**
 * Creates a typed errors object from a set of code definitions. Each code
 * becomes a {@link HintHandle} with `.report()` / `.throw()` — no `new`
 * required, no proxy.
 */
export function defineErrors<
  Codes extends Record<string, MessageTemplate | 0>,
  const Reporters extends readonly AnyHintReporter[],
>(options: DefineErrorsOptions<Codes, Reporters>): Errors<Codes, Reporters> {
  const reporters = options.reporters ?? []
  const result = {} as Errors<Codes, Reporters>

  for (const code of Object.keys(options.codes) as Extract<keyof Codes, string>[]) {
    const template = options.codes[code]
    const isFn = typeof template === 'function'

    // TODO: fix the any
    const handle: HintHandle<any, any> = {
      report(...args: any[]): Hint {
        const message = isFn ? (template as (p: any) => string)(args[0]) : (template as string)
        const hint = new Hint({ why: message }, handle.report)
        hint.name = code
        const reporterOptions = (isFn ? args[1] : args[0]) ?? {}
        for (const reporter of reporters) reporter(hint, reporterOptions)
        return hint
      },
      throw(...args: any[]): never {
        throw this.report(...(args as any))
      },
    }

    result[code] = handle
  }

  return result
}

export const errors = defineErrors({
  docsBase: code => `https://example.com/docs/errors/${code.toLowerCase()}`,
  codes: {
    NUXT_B2011: 'This is a bad example of an error code because it has no info',

    // a good error: why it failed and how to fix it
    NUXT_E032: 'The server failed reload the configuration file. Manually restart the server.',

    NUXT_E033: (moduleName: string) =>
      `The module "${moduleName}" is not compatible with the current version of Nuxt. Please check the module documentation for compatibility information.`,
  },

  reporters: [reporterLog],
})

export type IsAny<Type> = 0 extends 1 & Type ? true : false
export type IsUnknown<Type> = IsAny<Type> extends true ? false : unknown extends Type ? true : false
export type Prettify<Type> = {
  [Key in keyof Type]: Type[Key]
}

/**
 * Extracts the options object a reporter accepts as its 2nd argument. Returns
 * `{}` when the reporter has no 2nd arg (so it contributes nothing to the
 * merged shape).
 */
type ExtractSingleReporterOptions<Reporter> = Reporter extends (
  hint: Hint,
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

export const errorsProd = defineErrors({
  docsBase: code => `https://example.com/docs/errors/${code.toLowerCase()}`,
  codes: {
    // zero is short and usually common in code
    NUXT_B2011: 0,
    NUXT_E032: 0,
    NUXT_E033: 0,
  },
})

function _usage(): void {
  errors.NUXT_B2011.report()
  errors.NUXT_B2011.report(undefined)
  errors.NUXT_B2011.report(
    // @ts-expect-error: only undefined
    'ohno',
  )
  errors.NUXT_E033.report('my-module')
  // @ts-expect-error: requires a parameter
  errors.NUXT_E033.report()
  errors.NUXT_E033.report(
    // @ts-expect-error: requires a string parameter
    20,
  )

  const a: number | undefined = 2 as number | undefined
  // throwing
  if (typeof a === 'number') {
    errors.NUXT_E033.throw('my-module')
    console.error(a.toFixed(2))
  }
}
