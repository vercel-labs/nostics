import type { Formatter } from '../types'

export const jsonFormatter: Formatter = diagnostic => JSON.stringify(diagnostic)
