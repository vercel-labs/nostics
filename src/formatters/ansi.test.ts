import type { Colors } from './ansi'
import { describe, expect, it } from 'vitest'
import { defineDiagnostics } from '../diagnostic'
import { ansiFormatter } from './ansi'

function tag(label: string): (s: string) => string {
  return s => `<${label}>${s}</${label}>`
}

const colors: Colors = {
  red: tag('red'),
  yellow: tag('yellow'),
  cyan: tag('cyan'),
  gray: tag('gray'),
  bold: tag('bold'),
  dim: tag('dim'),
}

describe('ansiFormatter', () => {
  const format = ansiFormatter(colors)

  it('renders header-only diagnostics on a single line', () => {
    const diagnostics = defineDiagnostics({ codes: { E1: { why: 'broken' } } })
    const d = diagnostics.E1()
    expect(format(d)).toBe('<bold><red>[E1]</red></bold> broken')
  })

  it('renders fix, sources, and docs as connected details', () => {
    const diagnostics = defineDiagnostics({
      docsBase: 'https://docs.test',
      codes: { E1: { why: 'broken', fix: 'do x' } },
    })
    const d = diagnostics.E1({ sources: ['a.ts:1:1', 'b.ts:2:2'] })
    expect(format(d)).toMatchInlineSnapshot(`
      "<bold><red>[E1]</red></bold> broken
      <dim>├▶</dim> <dim>fix:</dim> do x
      <dim>├▶</dim> <dim>sources:</dim> a.ts:1:1, b.ts:2:2
      <dim>╰▶</dim> <dim>see:</dim> <cyan>https://docs.test/e1</cyan>"
    `)
  })

  it('uses ╰▶ for the only detail', () => {
    const diagnostics = defineDiagnostics({ codes: { E1: { why: 'broken', fix: 'do x' } } })
    const d = diagnostics.E1()
    expect(format(d)).toMatchInlineSnapshot(`
      "<bold><red>[E1]</red></bold> broken
      <dim>╰▶</dim> <dim>fix:</dim> do x"
    `)
  })
})
