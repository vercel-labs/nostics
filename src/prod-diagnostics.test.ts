import { describe, expect, it, vi } from 'vitest'
import { Diagnostic } from './diagnostic'
import { defineProdDiagnostics } from './prod-diagnostics'

describe('defineProdDiagnostics', () => {
  it('returns a Diagnostic for any accessed code', () => {
    const errs = defineProdDiagnostics()
    const d = errs.ANY_CODE()
    expect(d).toBeInstanceOf(Error)
    expect(d).toBeInstanceOf(Diagnostic)
  })

  it('uses the accessed code as the instance `name`', () => {
    const errs = defineProdDiagnostics()
    const d = errs.NUXT_B2011()
    // parity with defineDiagnostics: the code becomes the instance name
    expect(d.name).toBe('NUXT_B2011')
  })

  it('points `why` at the docs URL when available', () => {
    const errs = defineProdDiagnostics({ docsBase: 'https://example.com/errors' })
    const d = errs.NUXT_B2011()
    expect(d.why).toBe('https://example.com/errors/nuxt_b2011')
    // header reads `NUXT_B2011: https://...` instead of doubling the code
    expect(String(d)).toBe('NUXT_B2011: https://example.com/errors/nuxt_b2011')
  })

  it('leaves `why` empty without docs so the thrown header is just the code', () => {
    const errs = defineProdDiagnostics()
    const d = errs.NUXT_B2011()
    expect(d.why).toBe('')
    // Error.prototype.toString drops the colon for an empty message
    expect(String(d)).toBe('NUXT_B2011')
  })

  it('produces fresh instances per call', () => {
    const errs = defineProdDiagnostics()
    expect(errs.X()).not.toBe(errs.X())
  })

  it('leaves data undefined', () => {
    const errs = defineProdDiagnostics()
    const d = errs.NUXT_B2011()

    expect(d.data).toBeUndefined()
    expect(JSON.parse(JSON.stringify(d))).not.toHaveProperty('data')
  })

  describe('docs derivation', () => {
    it('derives docs from a string docsBase', () => {
      const errs = defineProdDiagnostics({ docsBase: 'https://example.com/errors' })
      expect(errs.NUXT_E001().docs).toBe('https://example.com/errors/nuxt_e001')
    })

    it('derives docs from a function docsBase invoked with the code', () => {
      const docsBase = vi.fn((code: string) => `https://example.com/${code.toLowerCase()}`)
      const errs = defineProdDiagnostics({ docsBase })
      expect(errs.NUXT_E033().docs).toBe('https://example.com/nuxt_e033')
      expect(docsBase).toHaveBeenCalledWith('NUXT_E033')
    })

    it('leaves docs undefined when docsBase is omitted', () => {
      const errs = defineProdDiagnostics()
      expect(errs.X().docs).toBeUndefined()
    })
  })

  describe('reporters', () => {
    it('does not run reporters when none are provided', () => {
      const errs = defineProdDiagnostics()
      expect(() => errs.X()).not.toThrow()
    })

    it('runs provided reporters with the diagnostic', () => {
      const r = vi.fn((_diagnostic: Diagnostic) => {})
      const errs = defineProdDiagnostics({ reporters: [r] })
      const d = errs.X()
      expect(r).toHaveBeenCalledTimes(1)
      expect(r).toHaveBeenCalledWith(d, {})
    })

    it('forwards reporter options at the call site', () => {
      const r = vi.fn((_diagnostic: Diagnostic, _options: { priority: number }) => {})
      const errs = defineProdDiagnostics({ reporters: [r] })
      const d = errs.X(undefined, { priority: 5 })
      expect(r).toHaveBeenCalledWith(d, { priority: 5 })
    })
  })

  it('ignores non-string property access', () => {
    const errs = defineProdDiagnostics()
    // e.g. promise unwrapping / serialization probes must not produce handles
    expect((errs as Record<PropertyKey, unknown>)[Symbol.toPrimitive]).toBeUndefined()
  })
})
