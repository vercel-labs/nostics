import type { Diagnostic } from '../diagnostic'

/**
 * Renders a diagnostic into a multi-line, unicode-decorated string suitable
 * for terminal output. The first line is `[<name>] <message>`; optional
 * details (`fix`, `sources`, `docs`) follow with `├▶`/`╰▶` connectors.
 */
export function formatDiagnostic(diagnostic: Diagnostic): string {
  const header = `[${diagnostic.name}] ${diagnostic.message}`

  const details: string[] = []
  if (diagnostic.fix) {
    details.push(`fix: ${diagnostic.fix}`)
  }
  if (diagnostic.sources?.length) {
    details.push(`sources: ${diagnostic.sources.join(', ')}`)
  }
  if (diagnostic.docs) {
    details.push(`see: ${diagnostic.docs}`)
  }

  if (details.length === 0) {
    return header
  }

  const lines = details.map((detail, i) => {
    const connector = i < details.length - 1 ? '├▶' : '╰▶'
    return `${connector} ${detail}`
  })

  return [header, ...lines].join('\n')
}
