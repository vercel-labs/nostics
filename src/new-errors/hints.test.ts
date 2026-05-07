import { describe, expect, it, vi } from 'vitest'
import { mockConsoleError, mockConsoleWarn } from '../../test/mock-warn'
import {
  defineErrors,
  Hint,
  reporterError,
  reporterLog,
  reporterRequiredOptions,
  toValueWithArgs,
} from './hint'

mockConsoleWarn()
mockConsoleError()

describe('hint', () => {
  describe('class basics', () => {
    it('is an instance of Error and Hint', () => {
      const h = new Hint([], 'boom')
      expect(h).toBeInstanceOf(Error)
      expect(h).toBeInstanceOf(Hint)
    })

    it('exposes message and default name', () => {
      const h = new Hint([], 'boom')
      expect(h.message).toBe('boom')
      expect(h.name).toBe('Hint')
    })

    it('captures a stack pointing at the call site', () => {
      const h = new Hint([], 'boom')
      expect(h.stack).toBeDefined()
      expect(h.stack).toContain('hints.test.ts')
    })

    it('can be thrown and caught', () => {
      expect(() => {
        throw new Hint([], 'boom')
      }).toThrow(Hint)
      expect(() => {
        throw new Hint([], 'boom')
      }).toThrow('boom')
    })

    it('toJSON returns a serializable { message, stack, options } shape', () => {
      const h = new Hint([], 'boom')
      const j = h.toJSON() as { message: string, stack?: string, options: unknown }
      expect(j.message).toBe('boom')
      expect(j.stack).toBe(h.stack)
      expect('options' in j).toBe(true)
    })
  })

  describe('report() fan-out', () => {
    it('calls every reporter once', () => {
      const r1 = vi.fn()
      const r2 = vi.fn()
      const errs = defineErrors({ codes: { X: 'msg' }, reporters: [r1, r2] })
      new errs.X().report()
      expect(r1).toHaveBeenCalledTimes(1)
      expect(r2).toHaveBeenCalledTimes(1)
    })

    it('passes the hint as the first argument', () => {
      const r = vi.fn()
      const errs = defineErrors({ codes: { X: 'msg' }, reporters: [r] })
      const h = new errs.X()
      h.report()
      expect(r.mock.calls[0]![0]).toBe(h)
    })

    it('no reporters → no-op', () => {
      const errs = defineErrors({ codes: { X: 'msg' } })
      expect(() => new errs.X().report()).not.toThrow()
    })

    it('preserves reporter call order', () => {
      const calls: string[] = []
      const r1 = vi.fn(() => {
        calls.push('a')
      })
      const r2 = vi.fn(() => {
        calls.push('b')
      })
      const errs = defineErrors({ codes: { X: 'msg' }, reporters: [r1, r2] })
      new errs.X().report()
      expect(calls).toEqual(['a', 'b'])
    })
  })
})

describe('built-in reporters', () => {
  it('reporterError logs `Hint: <msg>` to console.error', () => {
    reporterError(new Hint([], 'boom'))
    expect('Hint: boom').toHaveBeenErrored()
  })

  it('reporterLog defaults to console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      reporterLog(new Hint([], 'boom'))
      expect(spy).toHaveBeenCalledWith('Hint: boom')
    }
    finally {
      spy.mockRestore()
    }
  })

  it('reporterLog routes to console.warn when method is "warn"', () => {
    reporterLog(new Hint([], 'boom'), { method: 'warn' })
    expect('Hint: boom').toHaveBeenWarned()
  })

  it('reporterLog routes to console.error when method is "error"', () => {
    reporterLog(new Hint([], 'boom'), { method: 'error' })
    expect('Hint: boom').toHaveBeenErrored()
  })

  it('reporterRequiredOptions includes the priority value', () => {
    reporterRequiredOptions(new Hint([], 'boom'), { priority: 7 })
    expect('priority: 7').toHaveBeenWarned()
  })
})

describe('defineErrors', () => {
  it('throws when accessing an undefined code', () => {
    const errs = defineErrors({ codes: { X: 'msg' } }) as Record<string, unknown>
    expect(() => errs.UNKNOWN).toThrow('Error code "UNKNOWN" is not defined.')
  })

  it('returns the same constructor on repeated access', () => {
    const errs = defineErrors({ codes: { X: 'msg' } })
    expect(errs.X).toBe(errs.X)
  })

  it('produces fresh Hint instances per `new`', () => {
    const errs = defineErrors({ codes: { X: 'msg' } })
    const a = new errs.X()
    const b = new errs.X()
    expect(a).not.toBe(b)
    expect(a).toBeInstanceOf(Hint)
    expect(b).toBeInstanceOf(Hint)
  })

  describe('static-message codes', () => {
    it('uses the configured string as message', () => {
      const errs = defineErrors({ codes: { X: 'static text' } })
      expect(new errs.X().message).toBe('static text')
    })

    it('accepts undefined explicitly', () => {
      const errs = defineErrors({ codes: { X: 'static' } })
      expect(new errs.X(undefined).message).toBe('static')
    })
  })

  describe('function-message codes', () => {
    it('interpolates a single object param', () => {
      const errs = defineErrors({
        codes: {
          X: (p: { name: string }) => `hello ${p.name}`,
        },
      })
      expect(new errs.X({ name: 'world' }).message).toBe('hello world')
    })

    it('supports primitive params', () => {
      const errs = defineErrors({
        codes: { X: (n: number) => `n=${n}` },
      })
      expect(new errs.X(1).message).toBe('n=1')
      expect(new errs.X(2).message).toBe('n=2')
    })
  })

  describe('per-code name (currently broken — refactor target)', () => {
    it('sets the diagnostic code as the instance `name`', () => {
      const errs = defineErrors({ codes: { NUXT_E033: 'msg' } })
      expect(new errs.NUXT_E033().name).toBe('NUXT_E033')
    })
  })

  describe('reporterOptions propagation (currently broken — refactor target)', () => {
    it('forwards options from `new` to reporters via report() — static template', () => {
      const errs = defineErrors({
        codes: { X: 'static' },
        reporters: [reporterRequiredOptions],
      })
      const Ctor = errs.X as unknown as new (
        params: undefined,
        options: { priority: number },
      ) => Hint
      const h = new Ctor(undefined, { priority: 1 })
      h.report()
      expect('priority: 1').toHaveBeenWarned()
    })

    it('forwards options from `new` to reporters via report() — function template', () => {
      const errs = defineErrors({
        codes: { X: (p: { who: string }) => `hi ${p.who}` },
        reporters: [reporterRequiredOptions],
      })
      const Ctor = errs.X as unknown as new (
        params: { who: string },
        options: { priority: number },
      ) => Hint
      const h = new Ctor({ who: 'me' }, { priority: 2 })
      h.report()
      expect('priority: 2').toHaveBeenWarned()
    })
  })

  describe('docsBase wiring (it.todo — not yet implemented)', () => {
    it.todo('sets Hint.docs to `${base}/${code.toLowerCase()}` when docsBase is a string')
    it.todo('sets Hint.docs from a function docsBase invoked with the code')
    it.todo('leaves Hint.docs undefined when docsBase is omitted')
  })

  describe('stack trace cleanup', () => {
    it('points back to the call site', () => {
      const errs = defineErrors({ codes: { X: 'msg' } })
      const h = new errs.X()
      expect(h.stack).toBeDefined()
      expect(h.stack).toContain('hints.test.ts')
    })
  })
})

describe('toValueWithArgs', () => {
  it('returns the value when not a function', () => {
    expect(toValueWithArgs('hello')).toBe('hello')
    expect(toValueWithArgs(42)).toBe(42)
    expect(toValueWithArgs(undefined)).toBe(undefined)
  })

  it('invokes the function with forwarded args', () => {
    const fn = vi.fn((a: number, b: number) => a + b)
    expect(toValueWithArgs(fn, 1, 2)).toBe(3)
    expect(fn).toHaveBeenCalledWith(1, 2)
  })

  it('invokes a zero-arg function with no args', () => {
    const fn = vi.fn(() => 'ok')
    expect(toValueWithArgs(fn)).toBe('ok')
    expect(fn).toHaveBeenCalledWith()
  })
})
