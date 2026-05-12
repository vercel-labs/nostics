/* eslint-disable ts/explicit-function-return-type -- type tests intentionally construct values without using them and exist purely to exercise inference */
/* eslint-disable unused-imports/no-unused-vars -- type tests intentionally construct values without using them and exist purely to exercise inference */

import type { Diagnostic } from './diagnostic'
import { describe, expectTypeOf, it } from 'vitest'
import { defineDiagnostics, reporterLog, reporterRequiredOptions } from './diagnostic'

describe('defineDiagnostics — reporter options inference', () => {
  it('options is optional when there are no reporters', () => {
    const errs = defineDiagnostics({
      codes: {
        X: {
          why: 'msg',
        },
      },
    })
    expectTypeOf(errs.X.report()).toEqualTypeOf<Diagnostic>()
    expectTypeOf(errs.X.report).parameters.toEqualTypeOf<[arg?: undefined]>()
  })

  it('options is optional when every reporter ignores options', () => {
    const r1 = (_diagnostic: Diagnostic): void => {}
    const r2 = (_diagnostic: Diagnostic): void => {}
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r1, r2] })
    expectTypeOf(errs.X.report).parameters.toEqualTypeOf<[arg?: undefined]>()
  })

  it('options is optional when every reporter has only optional fields', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'msg' } },
      reporters: [reporterLog],
    })
    errs.X.report()
    errs.X.report({ method: 'warn' })
    errs.X.throw()
    errs.X.throw({ method: 'warn' })
  })

  it('options is required when any reporter has a required field', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'msg' } },
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
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r1, r2] })
    errs.X.report({ priority: 5 })
    // @ts-expect-error: options is required
    errs.X.report()
    // @ts-expect-error: priority is required
    errs.X.report({})
  })

  it('merges optional + required reporters → required, fields intersected', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'msg' } },
      reporters: [reporterLog, reporterRequiredOptions],
    })
    errs.X.report({ priority: 1 })
    errs.X.report({ priority: 1, method: 'warn' })
    // @ts-expect-error: priority is required even though method is optional
    errs.X.report({ method: 'warn' })
  })
})

describe('defineDiagnostics — params inference', () => {
  it('all-static object takes no params', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'static', fix: 'static fix' } },
    })
    errs.X.report()
    errs.X.report(undefined)
    // @ts-expect-error: no params expected
    errs.X.report({ anything: true })
  })

  it('inherits params from why', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: (p: { name: string }) => `hi ${p.name}`, fix: 'static' } },
    })
    errs.X.report({ name: 'me' })
    // @ts-expect-error: params required
    errs.X.report()
    // @ts-expect-error: wrong shape
    errs.X.report({ wrong: true })
  })

  it('inherits params from fix when why is static', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'static', fix: (p: { module: string }) => p.module } },
    })
    errs.X.report({ module: 'foo' })
    // @ts-expect-error: params required
    errs.X.report()
  })

  it('inherits params from sources', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'static', sources: (p: { file: string }) => [p.file] } },
    })
    errs.X.report({ file: 'a.ts:1:1' })
    // @ts-expect-error: params required
    errs.X.report()
  })

  it('intersects params across multiple function fields', () => {
    const errs = defineDiagnostics({
      codes: {
        X: {
          why: (p: { name: string }) => p.name,
          fix: (p: { module: string }) => p.module,
        },
      },
    })
    errs.X.report({ name: 'me', module: 'foo' })
    // @ts-expect-error: params required
    errs.X.report()
    // @ts-expect-error: missing module
    errs.X.report({ name: 'me' })
  })

  it('params + required-options reporter → both required, in order', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: (p: { who: string }) => `hi ${p.who}` } },
      reporters: [reporterRequiredOptions],
    })
    errs.X.report({ who: 'me' }, { priority: 2 })
    errs.X.throw({ who: 'me' }, { priority: 2 })
    // @ts-expect-error: options required
    errs.X.report({ who: 'me' })
    // @ts-expect-error: params required
    errs.X.report()
  })

  it('params + optional-options reporter → params required, options optional', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: (p: { who: string }) => `hi ${p.who}` } },
      reporters: [reporterLog],
    })
    errs.X.report({ who: 'me' })
    errs.X.report({ who: 'me' }, { method: 'warn' })
  })
})

describe('defineDiagnostics — return types', () => {
  it('.report returns Diagnostic', () => {
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
    expectTypeOf(errs.X.report()).toEqualTypeOf<Diagnostic>()
  })

  it('.throw returns never', () => {
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
    expectTypeOf(errs.X.throw).returns.toBeNever()
  })

  it('rejects access to undefined codes at the type level', () => {
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
    expectTypeOf<keyof typeof errs>().toEqualTypeOf<'X'>()
  })
})
