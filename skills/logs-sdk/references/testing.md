# Testing Diagnostics

How to assert that the right diagnostics fire, without coupling tests to formatter output. Examples use Vitest; Jest is equivalent.

## Assert on structured fields, not formatted strings

A diagnostic is a plain object with a stable `code`. Assert on that. Formatted strings change when you swap formatters or tweak wording; the code never should.

```ts
// ❌ brittle — breaks when the message wording changes
expect(stderr).toContain('Division by zero')

// ✅ stable — the code is the contract
expect(err.diagnostic.code).toBe('MATH_E001')
```

## Testing `.throw()`

`.throw()` raises a `CodedError`. Use `toThrow` with the class, then catch to inspect fields.

```ts
import { expect, it } from 'vitest'
import { CodedError } from 'logs-sdk'
import { divide } from '../src/math'

it('throws MATH_E001 on division by zero', () => {
  expect(() => divide(1, 0)).toThrow(CodedError)

  try {
    divide(1, 0)
  }
  catch (err) {
    if (!(err instanceof CodedError)) throw err
    expect(err.diagnostic.code).toBe('MATH_E001')
    expect(err.diagnostic.level).toBe('error')
    expect(err.diagnostic.fix).toMatch(/denominator/i)
  }
})
```

## Testing `.warn()` / `.error()` / `.log()`

These don't throw — they format and hand off to reporters. To observe them in tests, swap the logger's reporters for a collector.

### The collector pattern

Export a `makeTestLogger` (or similar) from a test helper. It builds a logger that pushes every diagnostic into an array you can assert on.

```ts
// test/helpers/logger.ts
import { createLogger, type Reporter, type Diagnostic } from 'logs-sdk'
import { diagnostics } from '../../src/diagnostics'

export function makeTestLogger() {
  const collected: Diagnostic[] = []
  const collect: Reporter = d => void collected.push(d)
  const log = createLogger({
    diagnostics: [diagnostics],
    reporters: collect,
    captureStack: false, // stable snapshots, cheaper
  })
  return { log, collected }
}
```

Wire it into the code under test via dependency injection, or by re-exporting from the module that owns the logger and overriding in tests (see below).

### Assert that a specific code fired

```ts
import { expect, it } from 'vitest'
import { makeTestLogger } from './helpers/logger'

it('warns MATH_W001 on negative factorial input', () => {
  const { log, collected } = makeTestLogger()
  factorial(-3, { log })

  expect(collected).toHaveLength(1)
  expect(collected[0]).toMatchObject({
    code: 'MATH_W001',
    level: 'warn',
  })
  expect(collected[0].message).toContain('-3')
})
```

### Assert a code did **not** fire

```ts
it('does not warn on valid factorial input', () => {
  const { log, collected } = makeTestLogger()
  factorial(5, { log })

  expect(collected.every(d => d.code !== 'MATH_W001')).toBe(true)
})
```

### Assert overrides were applied

Per-call overrides (`cause`, `context`, `sources`) land on the diagnostic. Assert on them when the behavior matters.

```ts
it('attaches the original error as cause', () => {
  const { log, collected } = makeTestLogger()
  runWithError(log)

  expect(collected[0].cause).toBeInstanceOf(TypeError)
  expect(collected[0].context).toMatchObject({ requestId: 'abc-123' })
})
```

## Stubbing console in integration tests

When you can't inject a logger (it's a singleton deep in the code), spy on the console instead. `consoleReporter` routes `'error'` → `console.error` and everything else → `console.warn`.

```ts
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.restoreAllMocks())

it('warns on deprecated sum()', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  sum(1, 2)
  expect(warn).toHaveBeenCalledOnce()
  expect(warn.mock.calls[0][0]).toContain('[MATH_D001]') // the tag is stable
})
```

Asserting on the `[CODE]` tag is safer than asserting on the full message — the tag format is part of the public contract; message wording is not.

## Snapshotting formatter output

If you *do* want to snapshot formatter output (e.g. to catch unintended wording changes), disable stack capture so snapshots don't churn across environments:

```ts
const log = createLogger({
  diagnostics: [diagnostics],
  reporters: (_d, formatted) => snapshot.push(formatted),
  captureStack: false,
})
```

## Testing diagnostic definitions themselves

`defineDiagnostics()` is pure — you can call factories directly, no logger needed.

```ts
import { expect, it } from 'vitest'
import { diagnostics } from '../src/diagnostics'

it('MATH_W001 interpolates n into the message', () => {
  const d = diagnostics.MATH_W001({ n: -7 })
  expect(d.code).toBe('MATH_W001')
  expect(d.message).toContain('-7')
  expect(d.level).toBe('warn')
})

it('all codes have a fix or a hint', () => {
  for (const code of diagnostics.codes()) {
    const def = diagnostics.get(code)
    expect(def.fix ?? def.hint, `${code} missing fix/hint`).toBeDefined()
  }
})

it('docs URL is stable for MATH_E001', () => {
  expect(diagnostics.MATH_E001().docs).toBe('https://example.com/errors/math_e001')
})
```

The last pattern — iterating `diagnostics.codes()` and asserting invariants — is a cheap, high-value test for catching drift as the code registry grows.
