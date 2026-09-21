import type { Diagnostic } from '../diagnostic'

export const jsonFormatter = (d: Diagnostic): string => JSON.stringify(d)
