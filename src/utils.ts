// Type utilities for extracting params from template fields

export type Simplify<T> = { [K in keyof T]: T[K] } & {}

export type ExtractFieldParams<T> = T extends (params: infer P) => string ? P : Record<never, never>

export type ExtractParams<T>
  = & (T extends { message: infer M } ? ExtractFieldParams<M> : Record<never, never>)
    & (T extends { fix: infer F } ? ExtractFieldParams<F> : Record<never, never>)
    & (T extends { why: infer W } ? ExtractFieldParams<W> : Record<never, never>)
    & (T extends { hint: infer H } ? ExtractFieldParams<H> : Record<never, never>)

export type IsEmptyObject<T> = keyof T extends never ? true : false
