#!/usr/bin/env node

import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const projectDir = process.env.CLAUDE_PROJECT_DIR || '.'
const logFile = join(projectDir, '.diagnostics.log')
const debugEnabled = !!process.env.DEBUG
const debugLog = join(projectDir, '.diagnostics-hook-debug.log')

function debug(msg) {
  if (!debugEnabled)
    return
  const ts = new Date().toLocaleTimeString('en-GB')
  writeFileSync(debugLog, `[${ts}] ${msg}\n`, { flag: 'a' })
}

// Read stdin for hook input
let input = {}
try {
  const stdin = readFileSync(0, 'utf-8')
  input = JSON.parse(stdin)
}
catch { }

debug(`Hook fired. stop_hook_active=${input.stop_hook_active}`)

// Prevent infinite loops — if already in forced-continuation, let Claude stop
if (input.stop_hook_active) {
  debug('stop_hook_active=true, allowing stop.')
  process.exit(0)
}

// No log file or empty — nothing to do
try {
  const stat = statSync(logFile)
  if (stat.size === 0) {
    debug('Log file empty, allowing stop.')
    process.exit(0)
  }
}
catch {
  debug('No log file, allowing stop.')
  process.exit(0)
}

const content = readFileSync(logFile, 'utf-8')
const lines = content.split('\n').filter(Boolean)

if (lines.length === 0) {
  debug('No diagnostic lines, allowing stop.')
  process.exit(0)
}

const firstLine = lines[0]
debug(`First line: ${firstLine}`)

let dropCode
let dropFile
try {
  const d = JSON.parse(firstLine)
  dropCode = d.code
  dropFile = d.sources?.[0]?.file
}
catch { }

const remaining = lines.slice(1).filter((line) => {
  // keep l
  if (!dropCode) {
    debug(`Potentially invalid line (no code to drop): ${line}`)
    return true
  }
  try {
    const d = JSON.parse(line)
    return !(d.code === dropCode && d.sources?.[0]?.file === dropFile)
  }
  catch (err) {
    debug(`Error parsing line, keeping it: ${line}\nError: ${err}`)
    return true
  }
})

debug(`Consumed 1, removed ${lines.length - 1 - remaining.length} duplicate(s), remaining: ${remaining.length}`)
writeFileSync(logFile, remaining.length ? `${remaining.join('\n')}\n` : '')

// Block stop and pass the diagnostic as reason
const output = JSON.stringify({
  decision: 'block',
  reason: `A runtime diagnostic was emitted by the application:\n${firstLine}\nPlease investigate and address this diagnostic. Check the source code related to this error code and fix the root cause.`,
})

debug(`Output: ${output}`)
process.stdout.write(`${output}\n`)
// Block the stop and let Claude continue running
process.exit(2)
