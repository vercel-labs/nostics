import type { Diagnostic, DiagnosticActions } from '../src/types'
import { describe, expectTypeOf, it } from 'vitest'
import { defineDiagnostics } from '../src/diagnostics'
import { createLogger } from '../src/logger'

describe('type tests', () => {
  const diagnostics = defineDiagnostics({
    prefix: 'TEST',
    codes: {
      E001: {
        message: 'No params needed.',
      },
      E002: {
        message: (p: { src: string }) => `Plugin ${p.src}`,
      },
      E003: {
        message: 'Static message.',
        fix: (p: { date: string }) => `Fix with ${p.date}`,
      },
      E004: {
        message: (p: { src: string }) => `Plugin ${p.src}`,
        fix: (p: { date: string }) => `Fix with ${p.date}`,
      },
    },
  })

  it('no-param factory takes only optional overrides', () => {
    expectTypeOf(diagnostics.E001).toBeCallableWith()
    expectTypeOf(diagnostics.E001()).toMatchTypeOf<Diagnostic>()
  })

  it('parameterized message factory requires params', () => {
    expectTypeOf(diagnostics.E002).toBeCallableWith({ src: 'test' })
    expectTypeOf(diagnostics.E002({ src: 'test' })).toMatchTypeOf<Diagnostic>()
  })

  it('params extracted from fix field', () => {
    expectTypeOf(diagnostics.E003).toBeCallableWith({ date: '2025-01-01' })
  })

  it('params from multiple fields are intersected', () => {
    expectTypeOf(diagnostics.E004).toBeCallableWith({ src: 'test', date: '2025-01-01' })
  })

  it('logger factories return DiagnosticActions', () => {
    const log = createLogger({ diagnostics: [diagnostics] })

    expectTypeOf(log.E001()).toMatchTypeOf<DiagnosticActions>()
    expectTypeOf(log.E002({ src: 'test' })).toMatchTypeOf<DiagnosticActions>()
  })

  it('logger merges multiple diagnostic sets', () => {
    const other = defineDiagnostics({
      codes: {
        X001: { message: 'Other diagnostic.' },
      },
    })
    const log = createLogger({ diagnostics: [diagnostics, other] })

    expectTypeOf(log.E001).toBeFunction()
    expectTypeOf(log.X001).toBeFunction()
  })

  it('logger has raw methods', () => {
    const log = createLogger({ diagnostics: [diagnostics] })

    expectTypeOf(log.throw).toBeCallableWith(diagnostics.E001())
    expectTypeOf(log.warn).toBeCallableWith(diagnostics.E001())
    expectTypeOf(log.format).toBeCallableWith(diagnostics.E001())
  })
})
