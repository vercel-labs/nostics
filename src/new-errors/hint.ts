/**
 * A template for a diagnostic text field — either a static string or a function
 * that receives interpolation parameters and returns a string.
 */
export type MessageTemplate<P = any> = string | ((params: P) => string)

/**
 * Represents how to report a hint. Could call `console.log()`, send the hint
 * to a server, or something else.
 */
export type HintReporter<Opts = undefined> = (
  hint: Hint,
  ...args: Opts extends undefined ? [options?: Opts] : [options: Opts]
) => void

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
  Reporters extends HintReporter[],
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
   * Reporters called when {@link Hint.report} is called. Can be used to
   * integrate with custom logging
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
 * Typed constructor for a hint class
 *
 * @internal
 */
interface HintConstructor<P, Opts> {
  new (
    ...args: P extends undefined
      ? Opts extends undefined
        ? [options?: Opts]
        : [options: Opts]
      : Opts extends undefined
        ? [params: P, options?: Opts]
        : [params: P, options: Opts]
  ): Hint
}

/**
 * Return type of {@link defineErrors}
 */
type Errors<Codes extends Record<string, MessageTemplate | 0>, Reporters extends HintReporter[]> = {
  [Code in keyof Codes]: HintConstructor<
    Codes[Code] extends (params: infer P) => string ? P : undefined,
    Prettify<ExtractReportersOptions<Reporters>>
  >
}

/**
 * Transforms a value or a function that returns a value to a value.
 *
 * @param valFn either a value or a function that returns a value
 * @param args  arguments to pass to the function if `valFn` is a function
 *
 * @internal
 */
export function toValueWithArgs<T, Args extends any[]>(
  valFn: T | ((...args: Args) => T),
  ...args: Args
): T {
  return typeof valFn === 'function' ? (valFn as (...args: Args) => T)(...args) : valFn
}

export class Hint<const Reporters extends HintReporter<any>[] = HintReporter[]> extends Error {
  name: string = 'Hint'

  /**
   * URL to extended documentation for this diagnostic code.
   * Auto-generated from {@link DefineDiagnosticsOptions.docsBase}.
   */
  docs?: string

  constructor(
    private reporters: Reporters,
    message: string,
    private reporterOptions?: Prettify<ExtractReportersOptions<Reporters>>,
  ) {
    super(message)
  }

  /**
   * Reports the hint using the provided reporters
   */
  report(): void {
    for (const reporter of this.reporters) {
      reporter(this, this.reporterOptions)
    }
  }

  /**
   * Converts the hint into a serializable structured object
   */
  toJSON(): object {
    return {
      message: this.message,
      stack: this.stack,
      options: this.reporterOptions,
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

new Hint([], 'hello').devOnly?.()

function _howToWriteIt(): void {
  // can be logged
  new Hint([], 'This is a hint').report()
  // what Vue Router and Vue do
  new Hint([reporterLog], 'This is a hint', {
    method: 'warn',
  }).report()

  // can be thrown
  if (Math.random() > 0.5) {
    throw new Hint([], 'This is a hint')
  }
}

function _becomesOption1(): void {
  /**
   * The id is just printed as a message and can be converted. It could also be
   * used to show a link to the docs or something else. The point is that it is
   * a stable identifier that can be used to find more information about the
   * hint.
   */
  new Hint([], 'NUXT_E001').report()
}

function _becomesOption2(): void {
  // auto injected and auto generated
  // import { NUXT_E0001 } from './diagnostics'
  // new Hint(NUXT_E0001).print()
  /* this requires way more setup, it's only useful to keep the same codebase
   * but I think that with AI, it's really easy to refactor even large code
   * bases
   */
}

/*
 * more advanced with structured data
 * requires same transformation as option 2
 */
function _howToWriteItWithDiagnostic(): void {
  // new Hint({
  //   code: 'HINT001',
  //   message: 'This is a hint with a code',
  //   cause,
  // }).report()
}

/**
 * Creates a typed errors object from a set of code definitions. Each code
 * becomes a callable factory that produces {@link Hint} errors with
 * template interpolation.
 */
export function defineErrors<
  Codes extends Record<string, MessageTemplate | 0>,
  const Reporters extends HintReporter[],
>(options: DefineErrorsOptions<Codes, Reporters>): Errors<Codes, Reporters> {
  return new Proxy({} as Partial<Errors<Codes, Reporters>>, {
    get(target, prop: Extract<keyof Codes, string>) {
      if (!options.codes[prop]) {
        throw new Error(`Error code "${prop}" is not defined.`)
      }
      if (!target[prop]) {
        target[prop] = new Proxy(Hint, {
          construct(Target, args: any[]) {
            const hint = new Target(
              options.reporters ?? [],
              toValueWithArgs(
                options.codes[prop],
                // @ts-expect-error: FIXME: ?
                ...args,
              ),
            )
            // remove the constructor line from the stack trace for cleaner output
            hint.stack = hint.stack?.split('\n').toSpliced(1, 1).join('\n')
            return hint
          },
        }) as any
      }
      return target[prop]
    },
  }) as any
}

export const errors = defineErrors({
  docsBase: (code) => `https://example.com/docs/errors/${code.toLowerCase()}`,
  codes: {
    NUXT_B2011: 'This is a bad example of an error code because it has no info',

    // a good error: why it failed and how to fix it
    NUXT_E032: 'The server failed reload the configuration file. Manually restart the server.',

    NUXT_E033: (moduleName: string) =>
      `The module "${moduleName}" is not compatible with the current version of Nuxt. Please check the module documentation for compatibility information.`,
  },

  reporters: [reporterLog],

  // reporters: [reporterLog, reporterError, reporterRequiredOptions],
})

export type IsAny<Type> = 0 extends 1 & Type ? true : false
export type IsUnknown<Type> = IsAny<Type> extends true ? false : unknown extends Type ? true : false
export type Prettify<Type> = {
  [Key in keyof Type]: Type[Key]
}

type ExtractSingleReporterOptions<Reporter> = Reporter extends (
  hint: Hint,
  options: infer Opts,
) => void
  ? IsUnknown<Opts> extends true
    ?
        // eslint-disable-next-line ts/no-empty-object-type
        {} | undefined
    : Opts
  : never

type logOpts = ExtractSingleReporterOptions<typeof reporterLog>
type errOpts = ExtractSingleReporterOptions<typeof reporterError>
type kk = logOpts & errOpts

type ExtractReportersOptions<Reporters extends any[]> = Reporters extends readonly [
  infer First,
  ...infer Rest,
]
  ? ExtractSingleReporterOptions<First> & ExtractReportersOptions<Rest>
  : {} | undefined

type ErrRep = typeof errors extends Errors<any, infer R> ? R : 'FAIL'
type C = Prettify<ExtractReportersOptions<typeof errors extends Errors<any, infer R> ? R : 'FAIL'>>

export const errorsProd = defineErrors({
  docsBase: (code) => `https://example.com/docs/errors/${code.toLowerCase()}`,
  codes: {
    // zero is short and usually common in code
    NUXT_B2011: 0,
    NUXT_E032: 0,
    NUXT_E033: 0,
  },
})

// function _usageProd() {
//   new errorsProd.NUXT_B2011().print()
//   new errorsProd.NUXT_B2011(undefined).print()
//   new errorsProd.NUXT_B2011(
//     'ohno',
//   ).print()
//   new errorsProd.NUXT_E033('my-module').print()
//   new errorsProd.NUXT_E033().print()
//   new errorsProd.NUXT_E033(
//     20,
//   ).print()
// }

function _usage(): void {
  new errors.NUXT_B2011().report()
  new errors.NUXT_B2011(undefined).report()
  new errors.NUXT_B2011(
    // @ts-expect-error: only undefined
    'ohno',
  ).report()
  new errors.NUXT_E033('my-module').report()
  // @ts-expect-error: requires a parameter
  new errors.NUXT_E033().report()
  new errors.NUXT_E033(
    // @ts-expect-error: requires a string parameter
    20,
  ).report()
}
