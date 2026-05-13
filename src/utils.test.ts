import { describe, expect, it, vi } from 'vitest'
import { toValueWithArgs } from './utils'

describe('toValueWithArgs', () => {
  it('returns the value when not a function', () => {
    expect(toValueWithArgs('hello')).toBe('hello')
    expect(toValueWithArgs(42)).toBe(42)
    expect(toValueWithArgs(undefined)).toBe(undefined)
  })

  it('invokes the function with forwarded args', () => {
    const fn = vi.fn((a: number, b: number) => a + b)
    expect(toValueWithArgs(fn, 1, 2)).toBe(3)
    expect(fn).toHaveBeenCalledWith(1, 2)
  })

  it('invokes a zero-arg function with no args', () => {
    const fn = vi.fn(() => 'ok')
    expect(toValueWithArgs(fn)).toBe('ok')
    expect(fn).toHaveBeenCalledWith()
  })
})
