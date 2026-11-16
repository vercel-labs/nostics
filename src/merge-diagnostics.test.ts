import { describe, expect, it } from 'vitest'
import { defineDiagnostics, Diagnostic } from './diagnostic'
import { mergeDiagnostics } from './merge-diagnostics'

describe('mergeDiagnostics', () => {
  const a = defineDiagnostics({ codes: { A: { why: 'a' } } })
  const b = defineDiagnostics({ codes: { B: { why: 'b' } } })
  const other = defineDiagnostics({ codes: { C: { why: 'c' } } })

  it('exposes the same handles as the source registries', () => {
    const merged = mergeDiagnostics(a, b)
    expect(merged.A).toBe(a.A)
    expect(merged.B).toBe(b.B)
    expect(merged.B().why).toBe('b')
  })

  it('lists only codes as keys', () => {
    const merged = mergeDiagnostics(a, b)
    expect(Object.keys(merged)).toEqual(['A', 'B'])
    expect(JSON.parse(JSON.stringify(merged))).toEqual({})
  })

  it('keeps is non-enumerable', () => {
    const merged = mergeDiagnostics(a, b)
    expect(Object.getOwnPropertyDescriptor(merged, 'is')).toMatchObject({ enumerable: false })
  })

  it('matches diagnostics of any merged registry', () => {
    const merged = mergeDiagnostics(a, b)
    expect(merged.is(a.A())).toBe(true)
    expect(merged.is(b.B())).toBe(true)
    expect(merged.is(other.C())).toBe(false)
    expect(merged.is(new Diagnostic({ code: 'A', why: 'a' }))).toBe(false)
    expect(merged.is(new Error('a'))).toBe(false)
  })

  it('keeps code guards working on merged handles', () => {
    const merged = mergeDiagnostics(a, b)
    expect(merged.A.is(merged.A())).toBe(true)
    expect(merged.A.is(merged.B())).toBe(false)
  })

  it('lets the last registry win on a duplicate code', () => {
    const a2 = defineDiagnostics({ codes: { A: { why: 'a2' } } })
    expect(mergeDiagnostics(a, a2).A().why).toBe('a2')
  })

  it('returns undefined for unknown codes', () => {
    const merged = mergeDiagnostics(a, b) as Record<string, unknown>
    expect(merged.NOPE).toBeUndefined()
  })
})
