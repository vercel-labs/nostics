import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineDiagnostics } from '../diagnostic'
import { createFetchReporter } from './fetch'

describe('createFetchReporter', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve({} as Response))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pOSTs the diagnostic as JSON to the URL', () => {
    const diagnostics = defineDiagnostics({
      codes: { E1: { why: 'broken', fix: 'fix it' } },
      reporters: [createFetchReporter('https://example.test/report')],
    })

    diagnostics.E1()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://example.test/report')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ name: 'E1', why: 'broken', fix: 'fix it' })
  })

  it('swallows fetch rejections', () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')))
    const diagnostics = defineDiagnostics({
      codes: { E1: { why: 'msg' } },
      reporters: [createFetchReporter('https://example.test/report')],
    })

    expect(() => diagnostics.E1()).not.toThrow()
  })
})
