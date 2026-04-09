import type { Diagnostic } from '../diagnostics'
import type { Formatter } from '../format'
import { formatTag } from '../format'

export interface Colors {
  red: (s: string) => string
  yellow: (s: string) => string
  cyan: (s: string) => string
  gray: (s: string) => string
  bold: (s: string) => string
  dim: (s: string) => string
}

function levelColor(colors: Colors, level: string): (s: string) => string {
  switch (level) {
    case 'error':
      return colors.red
    case 'warn':
    case 'deprecation':
      return colors.yellow
    case 'suggestion':
      return colors.cyan
    default:
      return s => s
  }
}

export function ansiFormatter(colors: Colors): Formatter {
  return (d: Diagnostic): string => {
    const colorize = levelColor(colors, d.level)
    const tag = colors.bold(colorize(formatTag(d)))
    const header = `${tag} ${d.message}`

    const details: string[] = []
    if (d.why)
      details.push(`${colors.dim('why:')} ${d.why}`)
    if (d.fix)
      details.push(`${colors.dim('fix:')} ${d.fix}`)
    if (d.hint)
      details.push(`${colors.dim('hint:')} ${colors.gray(d.hint)}`)
    if (d.docs)
      details.push(`${colors.dim('see:')} ${colors.cyan(d.docs)}`)

    if (details.length === 0)
      return header

    const lines = details.map((detail, i) => {
      const connector = i < details.length - 1
        ? colors.dim('├▶')
        : colors.dim('╰▶')
      return `${connector} ${detail}`
    })

    return [header, ...lines].join('\n')
  }
}
