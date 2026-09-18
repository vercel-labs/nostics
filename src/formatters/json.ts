import type { Diagnostic } from '../diagnostic'

export const jsonFormatter = (d: Diagnostic<any>): string => JSON.stringify(d)
