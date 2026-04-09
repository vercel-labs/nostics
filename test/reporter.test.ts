import type { Diagnostic } from '../src/diagnostics'
import { describe, expect, it, vi } from 'vitest'
import { consoleReporter, createFetchReporter } from '../src/reporter'

describe('consoleReporter', () => {
  it('calls console.error for error level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const d: Diagnostic = { code: 'E001', level: 'error', message: 'Error.' }
    consoleReporter(d, 'formatted error')
    expect(spy).toHaveBeenCalledWith('formatted error')
    spy.mockRestore()
  })

  it('calls console.warn for warn level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const d: Diagnostic = { code: 'W001', level: 'warn', message: 'Warning.' }
    consoleReporter(d, 'formatted warn')
    expect(spy).toHaveBeenCalledWith('formatted warn')
    spy.mockRestore()
  })

  it('calls console.warn for suggestion level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const d: Diagnostic = { code: 'S001', level: 'suggestion', message: 'Suggest.' }
    consoleReporter(d, 'formatted suggestion')
    expect(spy).toHaveBeenCalledWith('formatted suggestion')
    spy.mockRestore()
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
