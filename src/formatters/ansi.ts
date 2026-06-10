import type { Diagnostic } from '../diagnostic'

export interface Colors {
  red: (s: string) => string
  yellow: (s: string) => string
  cyan: (s: string) => string
  gray: (s: string) => string
  bold: (s: string) => string
  dim: (s: string) => string
}

/* @__NO_SIDE_EFFECTS__ */
export function ansiFormatter(colors: Colors): (d: Diagnostic) => string {
  return (d) => {
    const tag = colors.bold(colors.red(`[${d.name}]`))
    const header = `${tag} ${d.message}`

    const details: string[] = []
    if (d.fix)
      details.push(`${colors.dim('fix:')} ${d.fix}`)
    if (d.sources?.length)
      details.push(`${colors.dim('sources:')} ${d.sources.join(', ')}`)
    if (d.docs)
      details.push(`${colors.dim('see:')} ${colors.cyan(d.docs)}`)

    if (details.length === 0)
      return header

    const lines = details.map((detail, i) => {
      const connector = colors.dim(i < details.length - 1 ? '├▶' : '╰▶')
      return `${connector} ${detail}`
    })
    return [header, ...lines].join('\n')
  }
}
