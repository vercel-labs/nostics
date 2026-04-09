import type { Diagnostic } from '../src/diagnostics'
import { describe, expect, it } from 'vitest'
import { CodedError } from '../src/error'

describe('codedError', () => {
  const diagnostic: Diagnostic = {
    code: 'NUXT_B2011',
    level: 'error',
    message: 'Invalid plugin.',
    docs: 'https://nuxt.com/e/b2011',
    fix: 'Pass a src property.',
    why: 'Missing src.',
    hint: 'Check addPlugin() calls.',
  }

  it('is an instance of Error', () => {
    const err = new CodedError(diagnostic)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(CodedError)
  })

  it('has correct message with tag', () => {
    const err = new CodedError(diagnostic)
    expect(err.message).toBe('[NUXT_B2011] Invalid plugin.')
  })

  it('has correct name', () => {
    const err = new CodedError(diagnostic)
    expect(err.name).toBe('CodedError')
  })

  it('carries the full diagnostic', () => {
    const err = new CodedError(diagnostic)
    expect(err.diagnostic).toEqual(diagnostic)
    expect(err.diagnostic.code).toBe('NUXT_B2011')
    expect(err.diagnostic.docs).toBe('https://nuxt.com/e/b2011')
    expect(err.diagnostic.fix).toBe('Pass a src property.')
    expect(err.diagnostic.why).toBe('Missing src.')
    expect(err.diagnostic.hint).toBe('Check addPlugin() calls.')
  })

  it('sets cause when present', () => {
    const cause = new Error('root cause')
    const d: Diagnostic = { ...diagnostic, cause }
    const err = new CodedError(d)
    expect(err.cause).toBe(cause)
  })
})
