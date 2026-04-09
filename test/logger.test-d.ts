import type { DiagnosticActions } from '../src/logger'
import { describe, expectTypeOf, it } from 'vitest'
import { defineDiagnostics } from '../src/diagnostics'
import { createLogger } from '../src/logger'

describe('logger type tests', () => {
  const diagnostics = defineDiagnostics({
    codes: {
      E001: {
        message: 'No params needed.',
      },
      E002: {
        message: (p: { src: string }) => `Plugin ${p.src}`,
      },
    },
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
