import type { Formatter } from '../format'

export const jsonFormatter: Formatter = diagnostic => JSON.stringify(diagnostic)
