import type { Diagnostic } from '../src/diagnostics'
import { describe, expectTypeOf, it } from 'vitest'
import { defineDiagnostics } from '../src/diagnostics'

describe('diagnostics type tests', () => {
  const diagnostics = defineDiagnostics({
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
})
