import { describe, expect, it, vi } from 'vitest'
import { defineDiagnostics } from '../src/diagnostics'
import { CodedError } from '../src/error'
import { createLogger } from '../src/logger'

const nuxtDiags = defineDiagnostics({
  docsBase: code => `https://nuxt.com/e/${code.replace('NUXT_', '').toLowerCase()}`,
  codes: {
    NUXT_B1001: {
      message: 'Could not compile template.',
    },
    NUXT_B2011: {
      message: (p: { src: string }) => `Invalid plugin \`${p.src}\`.`,
    },
  },
})

const i18nDiags = defineDiagnostics({
  codes: {
    I18N_I001: {
      message: (p: { locale: string }) => `Missing translations for "${p.locale}".`,
      level: 'warn',
    },
  },
})

describe('createLogger', () => {
  it('merges multiple diagnostic sets', () => {
    const log = createLogger({ diagnostics: [nuxtDiags, i18nDiags] })
    expect(typeof log.NUXT_B1001).toBe('function')
    expect(typeof log.NUXT_B2011).toBe('function')
    expect(typeof log.I18N_I001).toBe('function')
  })

  it('.throw() throws CodedError', () => {
    const log = createLogger({ diagnostics: [nuxtDiags] })
    expect(() => log.NUXT_B1001().throw()).toThrow(CodedError)
  })

  it('.throw() error has correct diagnostic', () => {
    const log = createLogger({ diagnostics: [nuxtDiags] })
    try {
      log.NUXT_B2011({ src: '/bad.ts' }).throw()
    }
    catch (err) {
      expect(err).toBeInstanceOf(CodedError)
      expect((err as CodedError).diagnostic.code).toBe('NUXT_B2011')
      expect((err as CodedError).diagnostic.message).toBe('Invalid plugin `/bad.ts`.')
    }
  })

  it('.warn() calls reporter', () => {
    const reporter = vi.fn()
    const log = createLogger({ diagnostics: [nuxtDiags], reporter })
    log.NUXT_B1001().warn()
    expect(reporter).toHaveBeenCalled()
    const [diagnostic] = reporter.mock.calls[0]
    expect(diagnostic.level).toBe('warn')
  })

  it('.error() calls reporter with error level', () => {
    const reporter = vi.fn()
    const log = createLogger({ diagnostics: [i18nDiags], reporter })
    log.I18N_I001({ locale: 'fr' }).error()
    const [diagnostic] = reporter.mock.calls[0]
    expect(diagnostic.level).toBe('error')
  })

  it('.log() uses diagnostic own level', () => {
    const reporter = vi.fn()
    const log = createLogger({ diagnostics: [i18nDiags], reporter })
    log.I18N_I001({ locale: 'fr' }).log()
    const [diagnostic] = reporter.mock.calls[0]
    expect(diagnostic.level).toBe('warn')
  })

  it('.format() returns formatted string', () => {
    const formatter = vi.fn().mockReturnValue('formatted output')
    const log = createLogger({ diagnostics: [nuxtDiags], formatter })
    const result = log.NUXT_B1001().format()
    expect(result).toBe('formatted output')
  })

  it('raw throw() works with diagnostic object', () => {
    const log = createLogger({ diagnostics: [nuxtDiags] })
    const diag = nuxtDiags.NUXT_B1001()
    expect(() => log.throw(diag)).toThrow(CodedError)
  })

  it('raw warn() works with diagnostic object', () => {
    const reporter = vi.fn()
    const log = createLogger({ diagnostics: [nuxtDiags], reporter })
    log.warn(nuxtDiags.NUXT_B1001())
    expect(reporter).toHaveBeenCalled()
  })

  it('defaults to plainFormatter and consoleReporter', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => { })
    const log = createLogger({ diagnostics: [i18nDiags] })
    log.I18N_I001({ locale: 'fr' }).log()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[I18N_I001]'))
    spy.mockRestore()
  })

  it('supports array of reporters', () => {
    const reporter1 = vi.fn()
    const reporter2 = vi.fn()
    const log = createLogger({ diagnostics: [nuxtDiags], reporter: [reporter1, reporter2] })
    log.NUXT_B1001().log()
    expect(reporter1).toHaveBeenCalledTimes(1)
    expect(reporter2).toHaveBeenCalledTimes(1)
  })

  describe('stack capture', () => {
    it('captures stack on action methods pointing to call site', () => {
      const reporter = vi.fn()
      const log = createLogger({ diagnostics: [nuxtDiags], reporter })
      log.NUXT_B1001().warn()
      const [diagnostic] = reporter.mock.calls[0]
      expect(diagnostic.stack).toBeDefined()
      expect(diagnostic.stack).toContain('logger.test.ts')
      // No internal SDK frames leaked
      expect(diagnostic.stack).not.toContain('captureStack')
      expect(diagnostic.stack).not.toContain('formatAndReport')
    })

    it('does not capture stack on .format()', () => {
      const log = createLogger({ diagnostics: [nuxtDiags] })
      const actions = log.NUXT_B1001()
      actions.format()
      expect(actions.stack).toBeUndefined()
    })

    it('captures stack on raw logger methods', () => {
      const reporter = vi.fn()
      const log = createLogger({ diagnostics: [nuxtDiags], reporter })
      log.warn(nuxtDiags.NUXT_B1001())
      const [diagnostic] = reporter.mock.calls[0]
      expect(diagnostic.stack).toBeDefined()
      expect(diagnostic.stack).toContain('logger.test.ts')
    })

    it('does not capture stack when captureStack is false', () => {
      const reporter = vi.fn()
      const log = createLogger({ diagnostics: [nuxtDiags], reporter, captureStack: false })
      log.NUXT_B1001().warn()
      const [diagnostic] = reporter.mock.calls[0]
      expect(diagnostic.stack).toBeUndefined()
    })
  })
})
