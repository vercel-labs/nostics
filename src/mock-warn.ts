// Adapted from https://github.com/posva/pinia-colada test-utils
import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, expect, vi } from 'vitest'

interface CustomMatchers<R = unknown> {
  toHaveBeenWarned: () => R
  toHaveBeenWarnedLast: () => R
  toHaveBeenWarnedTimes: (n: number) => R
  toHaveBeenErrored: () => R
  toHaveBeenErroredLast: () => R
  toHaveBeenErroredTimes: (n: number) => R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> { }
  interface AsymmetricMatchersContaining extends CustomMatchers { }
}

function matchMessage(args: any[], received: string | RegExp): boolean {
  const msg = String(args[0])
  return typeof received === 'string' ? msg.includes(received) : received.test(msg)
}

function createMockConsoleMethod(method: 'warn' | 'error'): void {
  let mockInstance: MockInstance<(typeof console)[typeof method]>
  const asserted = new Map<string, string | RegExp>()

  const capitalMethod = method.charAt(0).toUpperCase() + method.slice(1)

  expect.extend({
    [`toHaveBeen${capitalMethod}ed`](received: string | RegExp) {
      asserted.set(received.toString(), received)
      const passed = mockInstance.mock.calls.some(args => matchMessage(args, received))

      return passed
        ? { pass: true, message: () => `expected "${received}" not to have been ${method}ed.` }
        : { pass: false, message: () => `expected "${received}" to have been ${method}ed.` }
    },

    [`toHaveBeen${capitalMethod}edLast`](received: string | RegExp) {
      asserted.set(received.toString(), received)
      const lastCall = mockInstance.mock.calls.at(-1)
      const passed = lastCall != null && matchMessage(lastCall, received)

      return passed
        ? { pass: true, message: () => `expected "${received}" not to have been ${method}ed last.` }
        : { pass: false, message: () => `expected "${received}" to have been ${method}ed last.` }
    },

    [`toHaveBeen${capitalMethod}edTimes`](received: string | RegExp, n: number) {
      asserted.set(received.toString(), received)
      const count = mockInstance.mock.calls.filter(args => matchMessage(args, received)).length

      return count === n
        ? { pass: true, message: () => `expected "${received}" to have been ${method}ed ${n} times.` }
        : { pass: false, message: () => `expected "${received}" to have been ${method}ed ${n} times but got ${count}.` }
    },
  })

  beforeEach(() => {
    asserted.clear()
    mockInstance = vi.spyOn(console, method).mockImplementation(() => { })
  })

  afterEach(() => {
    const assertedArray = Array.from(asserted)
    const unassertedLogs = mockInstance.mock.calls
      .map(args => String(args[0]))
      .filter(
        msg => !assertedArray.some(([_key, assertedMsg]) => matchMessage([msg], assertedMsg)),
      )

    mockInstance.mockRestore()

    if (unassertedLogs.length) {
      // eslint-disable-next-line no-console
      unassertedLogs.forEach(msg => console[method](msg))
      throw new Error(`Test case threw unexpected ${method}s.`, {
        cause: unassertedLogs,
      })
    }
  })
}

export function mockConsoleWarn(): void {
  createMockConsoleMethod('warn')
}

export function mockConsoleError(): void {
  createMockConsoleMethod('error')
}
