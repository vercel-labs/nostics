/* eslint-disable ts/explicit-function-return-type -- type tests intentionally construct values without using them and exist purely to exercise inference */
/* eslint-disable unused-imports/no-unused-vars -- type tests intentionally construct values without using them and exist purely to exercise inference */

import type { Diagnostic, DiagnosticCallParams } from './diagnostic'
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
    expectTypeOf(errs.X()).toEqualTypeOf<Diagnostic>()
    expectTypeOf(errs.X).parameters.toEqualTypeOf<[params?: DiagnosticCallParams | undefined]>()
  })

  it('options is optional when every reporter ignores options', () => {
    const r1 = (_diagnostic: Diagnostic): void => {}
    const r2 = (_diagnostic: Diagnostic): void => {}
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r1, r2] })
    expectTypeOf(errs.X).parameters.toEqualTypeOf<[params?: DiagnosticCallParams | undefined]>()
  })

  it('options is optional when every reporter has only optional fields', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'msg' } },
      reporters: [reporterLog],
    })
    errs.X()
    errs.X(undefined, { method: 'warn' })
    throw errs.X()
    throw errs.X(undefined, { method: 'warn' })
  })

  it('options is required when any reporter has a required field', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'msg' } },
      reporters: [reporterRequiredOptions],
    })
    errs.X(undefined, { priority: 1 })
    throw errs.X(undefined, { priority: 1 })
    // @ts-expect-error: options is required
    errs.X()
    // @ts-expect-error: options is required
    throw errs.X()
  })

  it('merges required + no-options reporters → required options on the required shape', () => {
    const r1 = (_diagnostic: Diagnostic) => {}
    const r2 = (_diagnostic: Diagnostic, _options: { priority: number }) => {}
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } }, reporters: [r1, r2] })
    errs.X(undefined, { priority: 5 })
    // @ts-expect-error: options is required
    errs.X()
    // @ts-expect-error: priority is required
    errs.X(undefined, {})
  })

  it('merges optional + required reporters → required, fields intersected', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'msg' } },
      reporters: [reporterLog, reporterRequiredOptions],
    })
    errs.X(undefined, { priority: 1 })
    errs.X(undefined, { priority: 1, method: 'warn' })
    // @ts-expect-error: priority is required even though method is optional
    errs.X(undefined, { method: 'warn' })
  })
})

describe('defineDiagnostics — params inference', () => {
  it('all-static object takes only the call-site params (cause/sources)', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'static', fix: 'static fix' } },
    })
    errs.X()
    errs.X(undefined)
    errs.X({ cause: new Error('orig') })
    errs.X({ sources: ['a.ts:1:1'] })
    errs.X({ cause: new Error('orig'), sources: ['a.ts:1:1'] })
    // @ts-expect-error: only cause/sources are allowed
    errs.X({ anything: true })
  })

  it('inherits params from why', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: (p: { name: string }) => `hi ${p.name}`, fix: 'static' } },
    })
    errs.X({ name: 'me' })
    // @ts-expect-error: params required
    errs.X()
    // @ts-expect-error: wrong shape
    errs.X({ wrong: true })
  })

  it('inherits params from fix when why is static', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: 'static', fix: (p: { module: string }) => p.module } },
    })
    errs.X({ module: 'foo' })
    // @ts-expect-error: params required
    errs.X()
  })

  it('merges cause and sources into interpolation params', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: (p: { name: string }) => `hi ${p.name}` } },
    })
    errs.X({ name: 'me' })
    errs.X({ name: 'me', cause: new Error('orig') })
    errs.X({ name: 'me', sources: ['a.ts:1:1'] })
    errs.X({ name: 'me', cause: new Error('orig'), sources: ['a.ts:1:1'] })
    // @ts-expect-error: name is still required
    errs.X({ cause: new Error('orig') })
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
    errs.X({ name: 'me', module: 'foo' })
    // @ts-expect-error: params required
    errs.X()
    // @ts-expect-error: missing module
    errs.X({ name: 'me' })
  })

  it('params + required-options reporter → both required, in order', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: (p: { who: string }) => `hi ${p.who}` } },
      reporters: [reporterRequiredOptions],
    })
    errs.X({ who: 'me' }, { priority: 2 })
    throw errs.X({ who: 'me' }, { priority: 2 })
    // @ts-expect-error: options required
    errs.X({ who: 'me' })
    // @ts-expect-error: params required
    errs.X()
  })

  it('params + optional-options reporter → params required, options optional', () => {
    const errs = defineDiagnostics({
      codes: { X: { why: (p: { who: string }) => `hi ${p.who}` } },
      reporters: [reporterLog],
    })
    errs.X({ who: 'me' })
    errs.X({ who: 'me' }, { method: 'warn' })
  })
})

describe('defineDiagnostics — per-code docs', () => {
  it('accepts `docs: string` on a code definition', () => {
    defineDiagnostics({
      codes: { X: { why: 'msg', docs: 'https://example.com/x' } },
    })
  })

  it('accepts `docs: false` on a code definition', () => {
    defineDiagnostics({
      codes: { X: { why: 'msg', docs: false } },
    })
  })

  it('rejects `docs: true` on a code definition', () => {
    defineDiagnostics({
      codes: {
        // @ts-expect-error: docs must be a string or false
        X: { why: 'msg', docs: true },
      },
    })
  })

  it('rejects non-string/non-false on docs', () => {
    defineDiagnostics({
      codes: {
        // @ts-expect-error: docs must be a string or false
        X: { why: 'msg', docs: 42 },
      },
    })
  })
})

describe('defineDiagnostics — return types', () => {
  it('the handle is callable and returns Diagnostic', () => {
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
    expectTypeOf(errs.X()).toEqualTypeOf<Diagnostic>()
    expectTypeOf(errs.X).returns.toEqualTypeOf<Diagnostic>()
  })

  it('rejects access to undefined codes at the type level', () => {
    const errs = defineDiagnostics({ codes: { X: { why: 'msg' } } })
    expectTypeOf<keyof typeof errs>().toEqualTypeOf<'X'>()
  })
})
