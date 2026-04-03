import type { Formatter } from '../types'

export const jsonFormatter: Formatter = {
  format(diagnostic) {
    return JSON.stringify(diagnostic)
  },
}
