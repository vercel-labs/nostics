import { describe, expect, it, vi } from 'vitest'
import { mockConsoleError, mockConsoleWarn } from '../../test/mock-warn'
import {
  defineDiagnostics,
  Diagnostic,
  reporterError,
  reporterLog,
  reporterRequiredOptions,
} from './diagnostic'

mockConsoleWarn()
mockConsoleError()

describe('diagnostic', () => {
  describe('instance shape (via defineDiagnostics)', () => {
    it('is an instance of Error and Diagnostic', () => {
      const errs = defineDiagnostics({ codes: { X_001: { why: 'boom' } } })
      const d = errs.X_001.report()
      expect(d).toBeInstanceOf(Error)
      expect(d).toBeInstanceOf(Diagnostic)
    })

    it('exposes message and uses the code as the instance name', () => {
      const errs = defineDiagnostics({ codes: { X_001: { why: 'boom' } } })
      const d = errs.X_001.report()
      expect(d.message).toBe('boom')
      expect(d.name).toBe('X_001')
    })

    it('toJSON returns a serializable { name, message, stack } shape', () => {
      const errs = defineDiagnostics({ codes: { X_001: { why: 'boom' } } })
      const d = errs.X_001.report()
      expect(d.toJSON()).toEqual({
        name: 'X_001',
        message: 'boom',
        stack: d.stack,
      })
    })

    it('`why` getter mirrors `message`', () => {
      const errs = defineDiagnostics({ codes: { X_001: { why: 'boom' } } })
      const d = errs.X_001.report()
      expect(d.why).toBe('boom')
      expect(d.why).toBe(d.message)
    })

    it('stores optional `fix` and exposes it on the instance', () => {
      const errs = defineDiagnostics({
        codes: { X_001: { why: 'boom', fix: 'restart it' } },
      })
      expect(errs.X_001.report().fix).toBe('restart it')
    })

    it('stores `sources` passed at the call site', () => {
      const sources = ['src/foo.ts:1:5', 'src/bar.ts:42:10']
      const errs = defineDiagnostics({ codes: { X_001: { why: 'boom' } } })
      expect(errs.X_001.report({ sources }).sources).toEqual(sources)
    })

    it('stores `cause` passed at the call site', () => {
      const original = new Error('original')
      const errs = defineDiagnostics({ codes: { X_001: { why: 'boom' } } })
      expect(errs.X_001.report({ cause: original }).cause).toBe(original)
    })

    it('toJSON includes optional fields when present', () => {
      const original = new Error('orig')
      const errs = defineDiagnostics({
        codes: { X_001: { why: 'boom', fix: 'restart' } },
      })
      const d = errs.X_001.report({ cause: original, sources: ['a.ts:1:1'] })
      expect(d.toJSON()).toEqual({
        name: 'X_001',
        message: 'boom',
        fix: 'restart',
        cause: original,
        sources: ['a.ts:1:1'],
        stack: d.stack,
      })
    })
  })

  describe('reporters', () => {
    it('calls every reporter once', () => {
      const r1 = vi.fn((_diagnostic: Diagnostic) => {})
      const r2 = vi.fn((_diagnostic: Diagnostic) => {})
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r1, r2] })
      errs.X.report()
      expect(r1).toHaveBeenCalledTimes(1)
      expect(r2).toHaveBeenCalledTimes(1)
    })

    it('passes the diagnostic as the first argument', () => {
      const r = vi.fn((_diagnostic: Diagnostic) => {})
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r] })
      const d = errs.X.report()
      expect(r.mock.calls[0]?.[0]).toBe(d)
    })

    it('forwards options to every reporter at runtime', () => {
      const r1 = vi.fn((_diagnostic: Diagnostic) => {})
      const r2 = vi.fn((_diagnostic: Diagnostic, _options: { priority: number }) => {})
      const errs = defineDiagnostics({
        codes: { X: { why: 'msg' } },
        reporters: [r1, r2],
      })
      const d = errs.X.report(undefined, { priority: 5 })
      expect(r1).toHaveBeenCalledWith(d, { priority: 5 })
      expect(r2).toHaveBeenCalledWith(d, { priority: 5 })
    })

    it('no reporters → no-op', () => {
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
      expect(() => errs.X.report()).not.toThrow()
    })

    it('preserves reporter call order', () => {
      const calls: string[] = []
      const r1 = vi.fn((_diagnostic: Diagnostic) => {
        calls.push('a')
      })
      const r2 = vi.fn((_diagnostic: Diagnostic) => {
        calls.push('b')
      })
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r1, r2] })
      errs.X.report()
      expect(calls).toEqual(['a', 'b'])
    })
  })

  describe('throw()', () => {
    it('throws the produced diagnostic', () => {
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
      expect(() => errs.X.throw()).toThrow(Diagnostic)
      expect(() => errs.X.throw()).toThrow('msg')
    })

    it('runs reporters before throwing', () => {
      const r = vi.fn((_diagnostic: Diagnostic) => {})
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r] })
      expect(() => errs.X.throw()).toThrow()
      expect(r).toHaveBeenCalledTimes(1)
    })

    it('supports `throw errs.X.report(...)` — report-then-throw', () => {
      const r = vi.fn((_diagnostic: Diagnostic) => {})
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r] })
      expect(() => {
        throw errs.X.report()
      }).toThrow(Diagnostic)
      expect(() => {
        throw errs.X.report()
      }).toThrow('msg')
      expect(r).toHaveBeenCalledTimes(2)
    })
  })
})

describe('built-in reporters', () => {
  it('reporterError logs `[<code>] <msg>` to console.error', () => {
    const errs = defineDiagnostics({
      codes: { NUXT_E001: { why: 'boom' } },
      reporters: [reporterError],
    })
    errs.NUXT_E001.report()
    expect('[NUXT_E001] boom').toHaveBeenErrored()
  })

  it('reporterLog defaults to console.log and includes the code', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      const errs = defineDiagnostics({
        codes: { NUXT_E001: { why: 'boom' } },
        reporters: [reporterLog],
      })
      errs.NUXT_E001.report()
      expect(spy).toHaveBeenCalledWith('[NUXT_E001] boom')
    }
    finally {
      spy.mockRestore()
    }
  })

  it('reporterLog routes to console.warn when method is "warn"', () => {
    const errs = defineDiagnostics({
      codes: { NUXT_E001: { why: 'boom' } },
      reporters: [(d: Diagnostic) => reporterLog(d, { method: 'warn' })],
    })
    errs.NUXT_E001.report()
    expect('[NUXT_E001] boom').toHaveBeenWarned()
  })

  it('reporterLog routes to console.error when method is "error"', () => {
    const errs = defineDiagnostics({
      codes: { NUXT_E001: { why: 'boom' } },
      reporters: [(d: Diagnostic) => reporterLog(d, { method: 'error' })],
    })
    errs.NUXT_E001.report()
    expect('[NUXT_E001] boom').toHaveBeenErrored()
  })

  it('renders the code, fix, and sources with unicode connectors', () => {
    const errs = defineDiagnostics({
      codes: {
        NUXT_E033: { why: 'boom', fix: 'restart it' },
      },
      reporters: [reporterError],
    })
    errs.NUXT_E033.report({ sources: ['a.ts:1:1', 'b.ts:2:2'] })
    expect(
      '[NUXT_E033] boom\n├▶ fix: restart it\n╰▶ sources: a.ts:1:1, b.ts:2:2',
    ).toHaveBeenErrored()
  })

  it('reporterRequiredOptions includes the code and the priority value', () => {
    const errs = defineDiagnostics({
      codes: { NUXT_E001: { why: 'boom' } },
      reporters: [reporterRequiredOptions],
    })
    errs.NUXT_E001.report(undefined, { priority: 7 })
    expect('[NUXT_E001] boom').toHaveBeenWarned()
    expect('priority: 7').toHaveBeenWarned()
  })
})

describe('defineDiagnostics', () => {
  it('returns the same handle on repeated access', () => {
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
    expect(errs.X).toBe(errs.X)
  })

  it('produces fresh Diagnostic instances per call', () => {
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
    const a = errs.X.report()
    const b = errs.X.report()
    expect(a).not.toBe(b)
    expect(a).toBeInstanceOf(Diagnostic)
    expect(b).toBeInstanceOf(Diagnostic)
  })

  describe('per-code name', () => {
    it('sets the diagnostic code as the instance `name`', () => {
      const errs = defineDiagnostics({ codes: { NUXT_E033: { why: 'msg' } } })
      expect(errs.NUXT_E033.report().name).toBe('NUXT_E033')
    })
  })

  describe('docsBase wiring (it.todo — not yet implemented)', () => {
    it.todo('sets Diagnostic.docs when docsBase is a string')
    it.todo('sets Diagnostic.docs from a function docsBase invoked with the code')
    it.todo('leaves Diagnostic.docs undefined when docsBase is omitted')
  })

  describe('static fields', () => {
    it('accepts a static object with why and fix', () => {
      const errs = defineDiagnostics({
        codes: {
          X: { why: 'static why', fix: 'static fix' },
        },
      })
      const d = errs.X.report()
      expect(d.message).toBe('static why')
      expect(d.fix).toBe('static fix')
    })
  })

  describe('call-site params', () => {
    it('forwards `cause` from the call site to the diagnostic', () => {
      const original = new Error('original')
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
      expect(errs.X.report({ cause: original }).cause).toBe(original)
    })

    it('forwards `sources` from the call site to the diagnostic', () => {
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
      expect(errs.X.report({ sources: ['a.ts:1:1'] }).sources).toEqual(['a.ts:1:1'])
    })

    it('merges cause and sources with interpolation params', () => {
      const original = new Error('original')
      const errs = defineDiagnostics({
        codes: { X: { why: (p: { name: string }) => `hi ${p.name}` } },
      })
      const d = errs.X.report({ name: 'world', cause: original, sources: ['a.ts:1:1'] })
      expect(d.message).toBe('hi world')
      expect(d.cause).toBe(original)
      expect(d.sources).toEqual(['a.ts:1:1'])
    })
  })

  describe('param interpolation', () => {
    it('interpolates params through why', () => {
      const errs = defineDiagnostics({
        codes: {
          X: { why: (p: { name: string }) => `hi ${p.name}`, fix: 'static fix' },
        },
      })
      const d = errs.X.report({ name: 'world' })
      expect(d.message).toBe('hi world')
      expect(d.fix).toBe('static fix')
    })

    it('interpolates params through fix when why is static', () => {
      const errs = defineDiagnostics({
        codes: {
          X: { why: 'msg', fix: (p: { module: string }) => `update ${p.module}` },
        },
      })
      const d = errs.X.report({ module: 'foo' })
      expect(d.message).toBe('msg')
      expect(d.fix).toBe('update foo')
    })

    it('shares params across multiple function fields', () => {
      const errs = defineDiagnostics({
        codes: {
          X: {
            why: (p: { name: string }) => `hi ${p.name}`,
            fix: (p: { name: string }) => `restart ${p.name}`,
          },
        },
      })
      const d = errs.X.report({ name: 'world' })
      expect(d.message).toBe('hi world')
      expect(d.fix).toBe('restart world')
    })

    it('throws with the resolved init', () => {
      const errs = defineDiagnostics({
        codes: {
          X: {
            why: (p: { name: string }) => `hi ${p.name}`,
            fix: 'restart',
          },
        },
      })
      try {
        errs.X.throw({ name: 'world', sources: ['world.ts:1:1'] })
      }
      catch (e) {
        expect(e).toBeInstanceOf(Diagnostic)
        expect((e as Diagnostic).message).toBe('hi world')
        expect((e as Diagnostic).fix).toBe('restart')
        expect((e as Diagnostic).sources).toEqual(['world.ts:1:1'])
      }
    })
  })

  describe('reporterOptions propagation', () => {
    it('forwards options from .report() to reporters — no params', () => {
      const errs = defineDiagnostics({
        codes: { X: { why: 'static' } },
        reporters: [reporterRequiredOptions],
      })
      errs.X.report(undefined, { priority: 1 })
      expect('priority: 1').toHaveBeenWarned()
    })

    it('forwards options from .report() to reporters — with params', () => {
      const errs = defineDiagnostics({
        codes: { X: { why: (p: { who: string }) => `hi ${p.who}` } },
        reporters: [reporterRequiredOptions],
      })
      errs.X.report({ who: 'me' }, { priority: 2 })
      expect('priority: 2').toHaveBeenWarned()
    })

    it('forwards options through .throw() too', () => {
      const errs = defineDiagnostics({
        codes: { X: { why: 'static' } },
        reporters: [reporterRequiredOptions],
      })
      expect(() => errs.X.throw(undefined, { priority: 3 })).toThrow()
      expect('priority: 3').toHaveBeenWarned()
    })
  })

  describe('stack trace cleanup', () => {
    it('points back to the call site', () => {
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
      const d = errs.X.report()
      expect(d.stack).toBeDefined()
      // take the first line of the stack
      expect(d.stack?.split('\n').at(1)).toContain('diagnostics.test.ts')
    })

    it('does not include internal defineDiagnostics frames at the top', () => {
      const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
      const d = errs.X.report()
      const firstFrame = d.stack?.split('\n')[1] ?? ''
      expect(firstFrame).not.toContain('diagnostic.ts')
    })
  })
})
