import { describe, expect, it } from 'vitest'
import { defineDiagnostics } from '../diagnostic'
import { mockConsoleWarn } from '../mock-warn'
import { devReporter } from './dev'

mockConsoleWarn()

describe('devReporter', () => {
  it('is a function', () => {
    expect(typeof devReporter).toBe('function')
  })

  it('warns when import.meta.hot is missing (default test environment)', () => {
    const diagnostics = defineDiagnostics({
      codes: { E1: { why: 'msg' } },
      reporters: [devReporter],
    })

    diagnostics.E1.report()

    expect('import.meta.hot.send() is not available').toHaveBeenWarned()
  })
})
