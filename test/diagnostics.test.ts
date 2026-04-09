import { describe, expect, it } from 'vitest'
import { defineDiagnostics } from '../src/diagnostics'

const diagnostics = defineDiagnostics({
  docsBase: 'https://nuxt.com/e',
  codes: {
    NUXT_B1001: {
      message: 'Could not compile template.',
      fix: 'Check the template for syntax errors.',
    },
    NUXT_B2011: {
      message: (p: { src: string }) => `Invalid plugin \`${p.src}\`. src option is required.`,
      fix: 'Pass a string path or an object with a `src` property to `addPlugin()`.',
    },
    NUXT_B5001: {
      message: 'Missing compatibilityDate in nuxt.config.',
      fix: (p: { date: string }) => `Add \`compatibilityDate: '${p.date}'\` to your nuxt.config.`,
      hint: 'This ensures consistent behavior across Nuxt versions.',
      level: 'warn',
    },
  },
})

describe('defineDiagnostics', () => {
  it('creates diagnostic with correct shape', () => {
    const d = diagnostics.NUXT_B1001()
    expect(d).toEqual({
      code: 'NUXT_B1001',
      level: 'error',
      message: 'Could not compile template.',
      fix: 'Check the template for syntax errors.',
      docs: 'https://nuxt.com/e/nuxt_b1001',
    })
  })

  it('interpolates message params', () => {
    const d = diagnostics.NUXT_B2011({ src: '/plugins/bad.ts' })
    expect(d.message).toBe('Invalid plugin `/plugins/bad.ts`. src option is required.')
    expect(d.code).toBe('NUXT_B2011')
    expect(d.docs).toBe('https://nuxt.com/e/nuxt_b2011')
  })

  it('interpolates fix params', () => {
    const d = diagnostics.NUXT_B5001({ date: '2025-01-01' })
    expect(d.fix).toBe('Add `compatibilityDate: \'2025-01-01\'` to your nuxt.config.')
    expect(d.hint).toBe('This ensures consistent behavior across Nuxt versions.')
  })

  it('uses custom level from definition', () => {
    const d = diagnostics.NUXT_B5001({ date: '2025-01-01' })
    expect(d.level).toBe('warn')
  })

  it('defaults level to error', () => {
    const d = diagnostics.NUXT_B1001()
    expect(d.level).toBe('error')
  })

  it('applies overrides', () => {
    const d = diagnostics.NUXT_B1001({ level: 'warn', context: { module: 'test' } })
    expect(d.level).toBe('warn')
    expect(d.context).toEqual({ module: 'test' })
  })

  it('applies overrides with params', () => {
    const d = diagnostics.NUXT_B2011({ src: '/bad.ts' }, { level: 'warn' })
    expect(d.level).toBe('warn')
    expect(d.message).toBe('Invalid plugin `/bad.ts`. src option is required.')
  })

  it('codes() returns all keys', () => {
    expect(diagnostics.codes()).toEqual(['NUXT_B1001', 'NUXT_B2011', 'NUXT_B5001'])
  })

  it('has() checks existence', () => {
    expect(diagnostics.has('NUXT_B1001')).toBe(true)
    expect(diagnostics.has('XXXX')).toBe(false)
  })

  it('get() returns definition', () => {
    const def = diagnostics.get('NUXT_B1001')
    expect(def.message).toBe('Could not compile template.')
  })

  it('extend() adds new codes', () => {
    const extended = diagnostics.extend({
      NUXT_B9999: {
        message: 'Extended diagnostic.',
      },
    })
    expect(extended.NUXT_B9999().message).toBe('Extended diagnostic.')
    expect(extended.NUXT_B1001().code).toBe('NUXT_B1001')
  })
})
