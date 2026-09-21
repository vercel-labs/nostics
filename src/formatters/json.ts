import type { Diagnostic } from '../diagnostic'

export const jsonFormatter = (d: Diagnostic<unknown>): string => JSON.stringify(d)
