/* eslint-disable ts/explicit-function-return-type -- type tests intentionally construct values without using them and exist purely to exercise inference */
/* eslint-disable unused-imports/no-unused-vars -- type tests intentionally construct values without using them and exist purely to exercise inference */

import type { Diagnostic } from './diagnostic'
import { describe, expectTypeOf, it } from 'vitest'
import { defineDiagnostics, reporterLog, reporterRequiredOptions } from './diagnostic'

describe('defineDiagnostics — reporter options inference', () => {
  it('options is optional when there are no reporters', () => {
    const errs = defineDiagnostics({ codes: { X: 'msg' } })
    expectTypeOf(errs.X.report()).toEqualTypeOf<Diagnostic>()
    expectTypeOf(errs.X.report).parameters.toEqualTypeOf<[arg?: undefined]>()
  })

  it('options is optional when every reporter ignores options', () => {
    const r1 = (_diagnostic: Diagnostic): void => {}
    const r2 = (_diagnostic: Diagnostic): void => {}
    const errs = defineDiagnostics({ codes: { X: 'msg' }, reporters: [r1, r2] })
    expectTypeOf(errs.X.report).parameters.toEqualTypeOf<[arg?: undefined]>()
  })

  it('options is optional when every reporter has only optional fields', () => {
    const errs = defineDiagnostics({
      codes: { X: 'msg' },
      reporters: [reporterLog],
    })
    errs.X.report()
    errs.X.report({ method: 'warn' })
    errs.X.throw()
    errs.X.throw({ method: 'warn' })
  })

  it('options is required when any reporter has a required field', () => {
    const errs = defineDiagnostics({
      codes: { X: 'msg' },
      reporters: [reporterRequiredOptions],
    })
    errs.X.report({ priority: 1 })
    errs.X.throw({ priority: 1 })
    // @ts-expect-error: options is required
    errs.X.report()
    // @ts-expect-error: options is required
    errs.X.throw()
  })

  it('merges required + no-options reporters → required options on the required shape', () => {
    const r1 = (_diagnostic: Diagnostic) => {}
    const r2 = (_diagnostic: Diagnostic, _options: { priority: number }) => {}
    const errs = defineDiagnostics({ codes: { X: 'msg' }, reporters: [r1, r2] })
    errs.X.report({ priority: 5 })
    // @ts-expect-error: options is required
    errs.X.report()
    // @ts-expect-error: priority is required
    errs.X.report({})
  })

  it('merges optional + required reporters → required, fields intersected', () => {
    const errs = defineDiagnostics({
      codes: { X: 'msg' },
      reporters: [reporterLog, reporterRequiredOptions],
    })
    errs.X.report({ priority: 1 })
    errs.X.report({ priority: 1, method: 'warn' })
    // @ts-expect-error: priority is required even though method is optional
    errs.X.report({ method: 'warn' })
  })
})

describe('defineDiagnostics — params inference', () => {
  it('static-message code takes no params', () => {
    const errs = defineDiagnostics({ codes: { X: 'static' } })
    errs.X.report()
    errs.X.report(undefined)
    // @ts-expect-error: static codes do not accept a string param
    errs.X.report('nope')
  })

  it('function-message code requires its param', () => {
    const errs = defineDiagnostics({
      codes: { X: (p: { name: string }) => `hi ${p.name}` },
    })
    errs.X.report({ name: 'world' })
    // @ts-expect-error: params required
    errs.X.report()
    // @ts-expect-error: wrong param shape
    errs.X.report({ wrong: true })
  })

  it('function-message + required-options reporter → both required, in order', () => {
    const errs = defineDiagnostics({
      codes: { X: (p: { who: string }) => `hi ${p.who}` },
      reporters: [reporterRequiredOptions],
    })
    errs.X.report({ who: 'me' }, { priority: 2 })
    errs.X.throw({ who: 'me' }, { priority: 2 })
    // @ts-expect-error: options required
    errs.X.report({ who: 'me' })
    // @ts-expect-error: params required
    errs.X.report()
  })

  it('function-message + optional-options reporter → params required, options optional', () => {
    const errs = defineDiagnostics({
      codes: { X: (p: { who: string }) => `hi ${p.who}` },
      reporters: [reporterLog],
    })
    errs.X.report({ who: 'me' })
    errs.X.report({ who: 'me' }, { method: 'warn' })
  })
})

describe('defineDiagnostics — return types', () => {
  it('.report returns Diagnostic', () => {
    const errs = defineDiagnostics({ codes: { X: 'msg' } })
    expectTypeOf(errs.X.report()).toEqualTypeOf<Diagnostic>()
  })

  it('.throw returns never', () => {
    const errs = defineDiagnostics({ codes: { X: 'msg' } })
    expectTypeOf(errs.X.throw).returns.toBeNever()
  })

  it('rejects access to undefined codes at the type level', () => {
    const errs = defineDiagnostics({ codes: { X: 'msg' } })
    expectTypeOf<keyof typeof errs>().toEqualTypeOf<'X'>()
  })
})
