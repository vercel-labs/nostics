import { describe, expect, it, vi } from 'vitest'
import { mockConsoleError, mockConsoleWarn } from '../../test/mock-warn'
import { defineErrors, Hint, reporterError, reporterLog, reporterRequiredOptions } from './hint'

mockConsoleWarn()
mockConsoleError()

describe('hint', () => {
  describe('class basics', () => {
    it('is an instance of Error and Hint', () => {
      const h = new Hint({ why: 'boom' })
      expect(h).toBeInstanceOf(Error)
      expect(h).toBeInstanceOf(Hint)
    })

    it('exposes message and default name', () => {
      const h = new Hint({ why: 'boom' })
      expect(h.message).toBe('boom')
      expect(h.name).toBe('Hint')
    })

    it('captures a stack pointing at the call site', () => {
      const h = new Hint({ why: 'boom' })
      expect(h.stack).toBeDefined()
      // take the first line of the stack
      expect(h.stack?.split('\n').at(1)).toContain('hints.test.ts')
    })

    it('toJSON returns a serializable { name, message, stack } shape', () => {
      const h = new Hint({ why: 'boom' })
      expect(h.toJSON()).toEqual({
        name: 'Hint',
        message: 'boom',
        stack: h.stack,
      })
    })

    it('`why` getter mirrors `message`', () => {
      const h = new Hint({ why: 'boom' })
      expect(h.why).toBe('boom')
      expect(h.why).toBe(h.message)
    })

    it('stores optional `fix` and exposes it on the instance', () => {
      const h = new Hint({ why: 'boom', fix: 'restart it' })
      expect(h.fix).toBe('restart it')
    })

    it('forwards `cause` to Error so `instanceof` chains work', () => {
      const original = new Error('original')
      const h = new Hint({ why: 'boom', cause: original })
      expect(h.cause).toBe(original)
    })

    it('stores optional `sources` in `file:line:column` format', () => {
      const sources = ['src/foo.ts:1:5', 'src/bar.ts:42:10']
      const h = new Hint({ why: 'boom', sources })
      expect(h.sources).toEqual(sources)
    })

    it('toJSON includes optional fields when present', () => {
      const original = new Error('orig')
      const h = new Hint({
        why: 'boom',
        fix: 'restart',
        cause: original,
        sources: ['a.ts:1:1'],
      })
      expect(h.toJSON()).toEqual({
        name: 'Hint',
        message: 'boom',
        fix: 'restart',
        cause: original,
        sources: ['a.ts:1:1'],
        stack: h.stack,
      })
    })
  })

  it('supports mixed static and function message templates', () => {
    const errs = defineErrors({
      codes: {
        STATIC: 'static message',
        DYNAMIC: (name: string) => `hello ${name}`,
      },
    })
    expect(errs.STATIC.report().message).toBe('static message')
    expect(errs.DYNAMIC.report('world').message).toBe('hello world')
  })

  describe('reporters', () => {
    it('calls every reporter once', () => {
      const r1 = vi.fn((_hint: Hint) => {})
      const r2 = vi.fn((_hint: Hint) => {})
      const errs = defineErrors({ codes: { X: 'msg' }, reporters: [r1, r2] })
      errs.X.report()
      expect(r1).toHaveBeenCalledTimes(1)
      expect(r2).toHaveBeenCalledTimes(1)
    })

    it('passes the hint as the first argument', () => {
      const r = vi.fn((_hint: Hint) => {})
      const errs = defineErrors({ codes: { X: 'msg' }, reporters: [r] })
      const h = errs.X.report()
      expect(r.mock.calls[0]?.[0]).toBe(h)
    })

    it('forwards options to every reporter at runtime', () => {
      const r1 = vi.fn((_hint: Hint) => {})
      const r2 = vi.fn((_hint: Hint, _options: { priority: number }) => {})
      const errs = defineErrors({
        codes: { X: 'msg' },
        reporters: [r1, r2],
      })
      const h = errs.X.report({ priority: 5 })
      expect(r1).toHaveBeenCalledWith(h, { priority: 5 })
      expect(r2).toHaveBeenCalledWith(h, { priority: 5 })
    })

    it('no reporters → no-op', () => {
      const errs = defineErrors({ codes: { X: 'msg' } })
      expect(() => errs.X.report()).not.toThrow()
    })

    it('preserves reporter call order', () => {
      const calls: string[] = []
      const r1 = vi.fn((_hint: Hint) => {
        calls.push('a')
      })
      const r2 = vi.fn((_hint: Hint) => {
        calls.push('b')
      })
      const errs = defineErrors({ codes: { X: 'msg' }, reporters: [r1, r2] })
      errs.X.report()
      expect(calls).toEqual(['a', 'b'])
    })
  })

  describe('throw()', () => {
    it('throws the produced hint', () => {
      const errs = defineErrors({ codes: { X: 'msg' } })
      expect(() => errs.X.throw()).toThrow(Hint)
      expect(() => errs.X.throw()).toThrow('msg')
    })

    it('runs reporters before throwing', () => {
      const r = vi.fn((_hint: Hint) => {})
      const errs = defineErrors({ codes: { X: 'msg' }, reporters: [r] })
      expect(() => errs.X.throw()).toThrow()
      expect(r).toHaveBeenCalledTimes(1)
    })

    it('supports `throw errs.X.report(...)` — report-then-throw', () => {
      const r = vi.fn((_hint: Hint) => {})
      const errs = defineErrors({ codes: { X: 'msg' }, reporters: [r] })
      expect(() => {
        throw errs.X.report()
      }).toThrow(Hint)
      expect(() => {
        throw errs.X.report()
      }).toThrow('msg')
      expect(r).toHaveBeenCalledTimes(2)
    })
  })
})

describe('built-in reporters', () => {
  it('reporterError logs `Hint: <msg>` to console.error', () => {
    reporterError(new Hint({ why: 'boom' }))
    expect('Hint: boom').toHaveBeenErrored()
  })

  it('reporterLog defaults to console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      reporterLog(new Hint({ why: 'boom' }))
      expect(spy).toHaveBeenCalledWith('Hint: boom')
    }
    finally {
      spy.mockRestore()
    }
  })

  it('reporterLog routes to console.warn when method is "warn"', () => {
    reporterLog(new Hint({ why: 'boom' }), { method: 'warn' })
    expect('Hint: boom').toHaveBeenWarned()
  })

  it('reporterLog routes to console.error when method is "error"', () => {
    reporterLog(new Hint({ why: 'boom' }), { method: 'error' })
    expect('Hint: boom').toHaveBeenErrored()
  })

  it('reporterRequiredOptions includes the priority value', () => {
    reporterRequiredOptions(new Hint({ why: 'boom' }), { priority: 7 })
    expect('priority: 7').toHaveBeenWarned()
  })
})

describe('defineErrors', () => {
  it('returns the same handle on repeated access', () => {
    const errs = defineErrors({ codes: { X: 'msg' } })
    expect(errs.X).toBe(errs.X)
  })

  it('produces fresh Hint instances per call', () => {
    const errs = defineErrors({ codes: { X: 'msg' } })
    const a = errs.X.report()
    const b = errs.X.report()
    expect(a).not.toBe(b)
    expect(a).toBeInstanceOf(Hint)
    expect(b).toBeInstanceOf(Hint)
  })

  describe('static-message codes', () => {
    it('uses the configured string as message', () => {
      const errs = defineErrors({ codes: { X: 'static text' } })
      expect(errs.X.report().message).toBe('static text')
    })

    it('accepts undefined explicitly', () => {
      const errs = defineErrors({ codes: { X: 'static' } })
      expect(errs.X.report(undefined).message).toBe('static')
    })
  })

  describe('function-message codes', () => {
    it('interpolates a single object param', () => {
      const errs = defineErrors({
        codes: {
          X: (p: { name: string }) => `hello ${p.name}`,
        },
      })
      expect(errs.X.report({ name: 'world' }).message).toBe('hello world')
    })

    it('supports primitive params', () => {
      const errs = defineErrors({
        codes: { X: (n: number) => `n=${n}` },
      })
      expect(errs.X.report(1).message).toBe('n=1')
      expect(errs.X.report(2).message).toBe('n=2')
    })
  })

  describe('per-code name', () => {
    it('sets the diagnostic code as the instance `name`', () => {
      const errs = defineErrors({ codes: { NUXT_E033: 'msg' } })
      expect(errs.NUXT_E033.report().name).toBe('NUXT_E033')
    })
  })

  describe('reporterOptions propagation', () => {
    it('forwards options from .report() to reporters — static template', () => {
      const errs = defineErrors({
        codes: { X: 'static' },
        reporters: [reporterRequiredOptions],
      })
      errs.X.report({ priority: 1 })
      expect('priority: 1').toHaveBeenWarned()
    })

    it('forwards options from .report() to reporters — function template', () => {
      const errs = defineErrors({
        codes: { X: (p: { who: string }) => `hi ${p.who}` },
        reporters: [reporterRequiredOptions],
      })
      errs.X.report({ who: 'me' }, { priority: 2 })
      expect('priority: 2').toHaveBeenWarned()
    })

    it('forwards options through .throw() too', () => {
      const errs = defineErrors({
        codes: { X: 'static' },
        reporters: [reporterRequiredOptions],
      })
      expect(() => errs.X.throw({ priority: 3 })).toThrow()
      expect('priority: 3').toHaveBeenWarned()
    })
  })

  describe('docsBase wiring (it.todo — not yet implemented)', () => {
    it.todo('sets Hint.docs when docsBase is a string')
    it.todo('sets Hint.docs from a function docsBase invoked with the code')
    it.todo('leaves Hint.docs undefined when docsBase is omitted')
  })

  describe('stack trace cleanup', () => {
    it('points back to the call site', () => {
      const errs = defineErrors({ codes: { X: 'msg' } })
      const h = errs.X.report()
      expect(h.stack).toBeDefined()
      // take the first line of the stack
      expect(h.stack?.split('\n').at(1)).toContain('hints.test.ts')
    })

    it('does not include internal defineErrors frames at the top', () => {
      const errs = defineErrors({ codes: { X: 'msg' } })
      const h = errs.X.report()
      const firstFrame = h.stack?.split('\n')[1] ?? ''
      expect(firstFrame).not.toContain('hint.ts')
    })
  })
})
