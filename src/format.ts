import type { Diagnostic, Formatter } from './types'

export function formatTag(d: Diagnostic): string {
  return d.prefix
    ? `[${d.prefix}_${d.code}]`
    : `[${d.code}]`
}

export function renderFrame(d: Diagnostic): string {
  const header = `${formatTag(d)} ${d.message}`

  const details: string[] = []
  if (d.why)
    details.push(`why: ${d.why}`)
  if (d.docs)
    details.push(`see: ${d.docs}`)
  if (d.fix)
    details.push(`fix: ${d.fix}`)
  if (d.hint)
    details.push(`hint: ${d.hint}`)

  if (details.length === 0)
    return header

  const lines = details.map((detail, i) => {
    const connector = i < details.length - 1 ? '├▶' : '╰▶'
    return `${connector} ${detail}`
  })

  return [header, ...lines].join('\n')
}

export const plainFormatter: Formatter = {
  format: renderFrame,
}
