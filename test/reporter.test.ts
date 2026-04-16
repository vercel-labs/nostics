import type { Diagnostic } from '../src/diagnostics'
import { describe, expect, it, vi } from 'vitest'
import { consoleReporter, createFetchReporter } from '../src/reporter'
import { mockConsoleError, mockConsoleWarn } from './mock-warn'

describe('consoleReporter', () => {
  mockConsoleWarn()
  mockConsoleError()

  it('calls console.error for error level', () => {
    const d: Diagnostic = { code: 'E001', level: 'error', message: 'Error.' }
    consoleReporter(d, 'formatted error')
    expect('formatted error').toHaveBeenErrored()
  })

  it('calls console.warn for warn level', () => {
    const d: Diagnostic = { code: 'W001', level: 'warn', message: 'Warning.' }
    consoleReporter(d, 'formatted warn')
    expect('formatted warn').toHaveBeenWarned()
  })

  it('calls console.warn for suggestion level', () => {
    const d: Diagnostic = { code: 'S001', level: 'suggestion', message: 'Suggest.' }
    consoleReporter(d, 'formatted suggestion')
    expect('formatted suggestion').toHaveBeenWarned()
  })
})

describe('createFetchReporter', () => {
  it('calls fetch with correct URL and body', () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal('fetch', mockFetch)

    const reporter = createFetchReporter('https://example.com/report')
    const d: Diagnostic = { code: 'E001', level: 'error', message: 'Error.' }
    reporter(d, 'formatted')

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })

    vi.unstubAllGlobals()
  })
})
