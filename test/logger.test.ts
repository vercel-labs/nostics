import { describe, expect, it, vi } from 'vitest'
import { defineDiagnostics } from '../src/diagnostics'
import { CodedError } from '../src/error'
import { createLogger } from '../src/logger'

const nuxtDiags = defineDiagnostics({
  prefix: 'NUXT',
  docsBase: 'https://nuxt.com/e',
  codes: {
    B1001: {
      message: 'Could not compile template.',
    },
    B2011: {
      message: (p: { src: string }) => `Invalid plugin \`${p.src}\`.`,
    },
  },
})

const i18nDiags = defineDiagnostics({
  prefix: 'I18N',
  codes: {
    I001: {
      message: (p: { locale: string }) => `Missing translations for "${p.locale}".`,
      level: 'warn',
    },
  },
})

describe('createLogger', () => {
  it('merges multiple diagnostic sets', () => {
    const log = createLogger({ diagnostics: [nuxtDiags, i18nDiags] })
    expect(typeof log.B1001).toBe('function')
    expect(typeof log.B2011).toBe('function')
    expect(typeof log.I001).toBe('function')
  })

  it('.throw() throws CodedError', () => {
    const log = createLogger({ diagnostics: [nuxtDiags] })
    expect(() => log.B1001().throw()).toThrow(CodedError)
  })

  it('.throw() error has correct diagnostic', () => {
    const log = createLogger({ diagnostics: [nuxtDiags] })
    try {
      log.B2011({ src: '/bad.ts' }).throw()
    }
    catch (err) {
      expect(err).toBeInstanceOf(CodedError)
      expect((err as CodedError).code).toBe('B2011')
      expect((err as CodedError).diagnostic.message).toBe('Invalid plugin `/bad.ts`.')
    }
  })

  it('.warn() calls reporter', () => {
    const reporter = { report: vi.fn() }
    const log = createLogger({ diagnostics: [nuxtDiags], reporter })
    log.B1001().warn()
    expect(reporter.report).toHaveBeenCalled()
    const [diagnostic] = reporter.report.mock.calls[0]
    expect(diagnostic.level).toBe('warn')
  })

  it('.error() calls reporter with error level', () => {
    const reporter = { report: vi.fn() }
    const log = createLogger({ diagnostics: [i18nDiags], reporter })
    log.I001({ locale: 'fr' }).error()
    const [diagnostic] = reporter.report.mock.calls[0]
    expect(diagnostic.level).toBe('error')
  })

  it('.log() uses diagnostic own level', () => {
    const reporter = { report: vi.fn() }
    const log = createLogger({ diagnostics: [i18nDiags], reporter })
    log.I001({ locale: 'fr' }).log()
    const [diagnostic] = reporter.report.mock.calls[0]
    expect(diagnostic.level).toBe('warn')
  })

  it('.format() returns formatted string', () => {
    const formatter = { format: vi.fn().mockReturnValue('formatted output') }
    const log = createLogger({ diagnostics: [nuxtDiags], formatter })
    const result = log.B1001().format()
    expect(result).toBe('formatted output')
  })

  it('raw throw() works with diagnostic object', () => {
    const log = createLogger({ diagnostics: [nuxtDiags] })
    const diag = nuxtDiags.B1001()
    expect(() => log.throw(diag)).toThrow(CodedError)
  })

  it('raw warn() works with diagnostic object', () => {
    const reporter = { report: vi.fn() }
    const log = createLogger({ diagnostics: [nuxtDiags], reporter })
    log.warn(nuxtDiags.B1001())
    expect(reporter.report).toHaveBeenCalled()
  })

  it('defaults to plainFormatter and consoleReporter', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const log = createLogger({ diagnostics: [i18nDiags] })
    log.I001({ locale: 'fr' }).log()
    expect(spy).toHaveBeenCalled()
    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('[I18N_I001]')
    spy.mockRestore()
  })
})
