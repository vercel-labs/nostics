import type { Diagnostic, ProdBrand } from './diagnostic'

/**
 * Any registry returned by {@link defineDiagnostics}.
 *
 * @internal
 */
type DevDiagnostics = { is: (error: unknown) => error is Diagnostic<any> } & {
  [Key in keyof ProdBrand]?: never
}

/**
 * Intersection of the code handles of every registry, without `is`.
 *
 * @internal
 */
type MergeCodes<Registries> = Registries extends readonly [infer First, ...infer Rest]
  ? { [Code in Exclude<keyof First, 'is'>]: First[Code] } & MergeCodes<Rest>
  : unknown

/**
 * Diagnostic type narrowed by a registry `is()`.
 *
 * @internal
 */
type GuardOf<Registry> = Registry extends { is: (error: unknown) => error is infer D } ? D : never

/**
 * Merges several {@link defineDiagnostics} registries into one with every code.
 * The handles are the same functions as in the source registries. `is()`
 * matches a diagnostic of any of them. On a duplicate code, the last registry
 * wins. For catalogs that ship in production too, so it rejects
 * {@link defineProdDiagnostics} registries.
 *
 * @example
 * ```ts
 * export const diagnostics = mergeDiagnostics(buildDiagnostics, runtimeDiagnostics)
 * diagnostics.is(error) // any code of both
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export function mergeDiagnostics<const Registries extends readonly DevDiagnostics[]>(
  ...registries: Registries
): MergeCodes<Registries> & {
  /**
   * Checks if any of the merged registries created `error` and narrows it to
   * their diagnostics.
   */
  is: (error: unknown) => error is GuardOf<Registries[number]>
} {
  // non-enumerable, like `defineDiagnostics()`: `Object.keys()` lists only codes
  return Object.defineProperty(Object.assign({}, ...registries), 'is', {
    value: (error: unknown) => registries.some((registry) => registry.is(error)),
  })
}
