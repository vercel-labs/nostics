import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineDiagnostics } from '../diagnostic'
import { mockConsoleError } from '../mock-warn'
import { createFileReporter } from './node'

mockConsoleError()

describe('createFileReporter', () => {
  let dir: string
  let logFile: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'logs-sdk-'))
    logFile = join(dir, 'out.log')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('appends one NDJSON line per diagnostic', () => {
    const diagnostics = defineDiagnostics({
      codes: {
        E1: { why: 'broken' },
        E2: { why: (p: { name: string }) => `bad ${p.name}` },
      },
      reporters: [createFileReporter({ logFile })],
    })

    diagnostics.E1.report()
    diagnostics.E2.report({ name: 'foo' })

    const lines = readFileSync(logFile, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0]!)).toMatchObject({ name: 'E1', why: 'broken' })
    expect(JSON.parse(lines[1]!)).toMatchObject({ name: 'E2', why: 'bad foo' })
  })

  it('uses the default file name when no option is provided', () => {
    const reporter = createFileReporter()
    expect(typeof reporter).toBe('function')
  })

  it('logs to console.error when the file cannot be written', () => {
    const diagnostics = defineDiagnostics({
      codes: { E1: { why: 'msg' } },
      reporters: [createFileReporter({ logFile: '/this/path/does/not/exist/log.txt' })],
    })

    expect(() => diagnostics.E1.report()).not.toThrow()
    expect('Failed to write log').toHaveBeenErrored()
  })
})
