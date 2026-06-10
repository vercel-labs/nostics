import { describe, expect, it } from 'vitest'
import { defineDiagnostics } from '../diagnostic'
import { mockConsoleWarn } from '../mock-warn'
import { createDevReporter } from './dev'

mockConsoleWarn()

describe('createDevReporter', () => {
  it('returns a reporter function', () => {
    expect(typeof createDevReporter()).toBe('function')
  })

  it('warns when import.meta.hot is missing (default test environment)', () => {
    const diagnostics = defineDiagnostics({
      codes: { E1: { why: 'msg' } },
      reporters: [createDevReporter()],
    })

    diagnostics.E1()

    expect('import.meta.hot.send() is not available').toHaveBeenWarned()
  })
})
