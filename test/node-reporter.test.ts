import type { Diagnostic } from '../src/diagnostics'
import { appendFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFileReporter } from '../src/reporters/node'

// We mock node:fs instead of writing real files to keep tests fast and side-effect free.
// Vitest recommends memfs (https://vitest.dev/guide/mocking/file-system) for more complex
// fs mocking, but a simple vi.mock is enough here since we only need to verify appendFileSync calls.
vi.mock('node:fs', () => ({
  appendFileSync: vi.fn(),
}))

const mockAppendFileSync = vi.mocked(appendFileSync)

describe('createFileReporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes NDJSON to the log file', () => {
    const reporter = createFileReporter({ logFile: 'test.log' })
    const d: Diagnostic = { code: 'E001', level: 'error', message: 'boom' }
    reporter(d, 'formatted')
    expect(mockAppendFileSync).toHaveBeenCalledWith('test.log', `${JSON.stringify(d)}\n`)
  })

  it('appends multiple diagnostics', () => {
    const reporter = createFileReporter({ logFile: 'test.log' })
    const d1: Diagnostic = { code: 'E001', level: 'error', message: 'first' }
    const d2: Diagnostic = { code: 'W001', level: 'warn', message: 'second' }
    reporter(d1, '')
    reporter(d2, '')
    expect(mockAppendFileSync).toHaveBeenCalledTimes(2)
    expect(mockAppendFileSync).toHaveBeenNthCalledWith(1, 'test.log', `${JSON.stringify(d1)}\n`)
    expect(mockAppendFileSync).toHaveBeenNthCalledWith(2, 'test.log', `${JSON.stringify(d2)}\n`)
  })

  it('defaults to .diagnostics.log', () => {
    const reporter = createFileReporter()
    const d: Diagnostic = { code: 'E001', level: 'error', message: 'boom' }
    reporter(d, '')
    expect(mockAppendFileSync).toHaveBeenCalledWith('.diagnostics.log', expect.any(String))
  })

  it('logs error to console on write failure', () => {
    mockAppendFileSync.mockImplementationOnce(() => {
      throw new Error('ENOENT')
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { })
    const reporter = createFileReporter({ logFile: 'bad.log' })
    const d: Diagnostic = { code: 'E001', level: 'error', message: 'boom' }
    reporter(d, '')
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[logs-sdk]'),
      expect.anything(),
    )
    spy.mockRestore()
  })
})
