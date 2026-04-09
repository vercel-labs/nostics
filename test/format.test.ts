import type { Diagnostic } from '../src/diagnostics'
import { describe, expect, it } from 'vitest'
import { plainFormatter } from '../src/format'

describe('plainFormatter', () => {
  it('formats header only when no details', () => {
    const d: Diagnostic = {
      code: 'E001',
      level: 'error',
      message: 'Something went wrong.',
    }
    expect(plainFormatter(d)).toBe('[E001] Something went wrong.')
  })

  it('formats full diagnostic with box-drawing', () => {
    const d: Diagnostic = {
      code: 'NUXT_B2011',
      level: 'error',
      message: 'Invalid plugin `/plugins/bad.ts`. src option is required.',
      why: 'The plugin object was passed without a src path',
      docs: 'https://nuxt.com/e/b2011',
      fix: 'Pass a string path or an object with a `src` property to `addPlugin()`.',
      hint: 'Check your module\'s addPlugin() calls',
    }

    expect(plainFormatter(d)).toMatchInlineSnapshot(`
      "[NUXT_B2011] Invalid plugin \`/plugins/bad.ts\`. src option is required.
      ├▶ why: The plugin object was passed without a src path
      ├▶ fix: Pass a string path or an object with a \`src\` property to \`addPlugin()\`.
      ├▶ hint: Check your module's addPlugin() calls
      ╰▶ see: https://nuxt.com/e/b2011"
    `)
  })

  it('omits missing optional fields', () => {
    const d: Diagnostic = {
      code: 'W001',
      level: 'warn',
      message: 'Deprecated API.',
      fix: 'Use the new API instead.',
    }

    const expected = [
      '[W001] Deprecated API.',
      '╰▶ fix: Use the new API instead.',
    ].join('\n')

    expect(plainFormatter(d)).toBe(expected)
  })

  it('orders details: why, fix, hint, see', () => {
    const d: Diagnostic = {
      code: 'T001',
      level: 'error',
      message: 'Test.',
      hint: 'A hint.',
      fix: 'A fix.',
      docs: 'https://docs.example.com',
      why: 'A reason.',
    }

    const output = plainFormatter(d)
    const lines = output.split('\n')
    expect(lines[1]).toContain('why:')
    expect(lines[2]).toContain('fix:')
    expect(lines[3]).toContain('hint:')
    expect(lines[4]).toContain('see:')
  })
})
