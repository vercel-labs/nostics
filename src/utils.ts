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

/**
 * A value of type T, or a function that resolves T from a single params object.
 *
 * @internal
 */
export type ValueOrFn<T, P = any> = T | ((params: P) => T)

/**
 * Extracts the param type from a single-arg function, or `never` for
 * non-function inputs. Pairs with {@link ValueOrFn}.
 *
 * @internal
 */
export type ExtractFnParam<T> = T extends (params: infer P) => any ? P : never

/**
 * Converts a union of types to their intersection.
 *
 * @internal
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never

/**
 * `true` when `T` is the `any` type.
 *
 * @internal
 */
export type IsAny<Type> = 0 extends 1 & Type ? true : false

/**
 * `true` when `T` is the `unknown` type (and not `any`).
 *
 * @internal
 */
export type IsUnknown<Type> = IsAny<Type> extends true ? false : unknown extends Type ? true : false

/**
 * Expands a type to its property listing so editor hovers show the resolved
 * shape instead of a chain of aliases / intersections.
 *
 * @internal
 */
export type Prettify<Type> = {
  [Key in keyof Type]: Type[Key]
}
