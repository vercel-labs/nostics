import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nosticsCollector } from './dev-server-collector'

type ReportListener = (data: unknown) => void

interface CollectorServer {
  config: {
    root: string
    logger: { info: (message: string) => void }
  }
  ws: {
    on: (event: string, listener: ReportListener) => void
  }
}

/**
 * Runs the collector's `configureServer` hook against a stub Vite server, then
 * exposes the `nostics:report` listener the collector registered so a test can
 * emulate a browser diagnostic.
 */
function startCollector(root: string, logFile: string) {
  const listeners = new Map<string, ReportListener>()
  const info = vi.fn()
  const server: CollectorServer = {
    config: { root, logger: { info } },
    ws: { on: (event, listener) => listeners.set(event, listener) },
  }

  const plugin = nosticsCollector.vite({ logFile, debug: false }) as unknown as {
    configureServer: (server: CollectorServer) => void
  }
  plugin.configureServer(server)

  return {
    info,
    report: (data: unknown) => listeners.get('nostics:report')?.(data),
  }
}

describe('nosticsCollector', () => {
  let root: string
  let cwd: string
  let previousCwd: string

  beforeEach(() => {
    previousCwd = process.cwd()
    root = mkdtempSync(join(tmpdir(), 'nostics-root-'))
    cwd = mkdtempSync(join(tmpdir(), 'nostics-cwd-'))
    // A Vite root that differs from the process cwd, e.g. a monorepo workspace.
    process.chdir(cwd)
  })

  afterEach(() => {
    process.chdir(previousCwd)
    rmSync(root, { recursive: true, force: true })
    rmSync(cwd, { recursive: true, force: true })
  })

  it('writes each diagnostic to the log file it announces under the Vite root', () => {
    const { info, report } = startCollector(root, 'collected.log')

    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith(expect.stringContaining('collected.log'))

    report({ name: 'E1', why: 'broken', fix: 'do x', data: undefined })

    const rootLog = join(root, 'collected.log')
    const lines = readFileSync(rootLog, 'utf8').trim().split('\n').filter(Boolean)

    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0]!)).toMatchObject({ name: 'E1', why: 'broken', fix: 'do x' })
    // Nothing should land next to the process cwd instead.
    expect(existsSync(join(cwd, 'collected.log'))).toBe(false)
  })
})
