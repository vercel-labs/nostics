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
