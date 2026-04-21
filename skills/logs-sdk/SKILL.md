---
name: logs-sdk
description: "Structured diagnostic codes for JS/TS. Use when a project imports `logs-sdk`, defines codes with `defineDiagnostics`, binds output with `createLogger`, throws `CodedError`, or wires the Vite plugins (`logsSDK`, `logsSDKServer`) / `devReporter`. Covers the quick-start, the two rules that types won't tell you (code permanence, dev-loop wiring), and points to the full API reference."
---

# logs-sdk

Typed diagnostic codes → plain serializable `Diagnostic` objects → chainable actions (`.throw()`, `.error()`, `.warn()`, `.log()`, `.format()`). A `CodedError` materializes only when you call `.throw()`.

## Quick-start

```ts
// src/diagnostics.ts
import { defineDiagnostics } from 'logs-sdk'

export const diagnostics = defineDiagnostics({
  docsBase: 'https://example.com/errors', // optional; auto-appends /${code.toLowerCase()}
  codes: {
    MATH_E001: {
      message: 'Division by zero',
      fix: 'Ensure the denominator is not zero',
    },
    MATH_W001: {
      message: (p: { n: number }) => `Negative input ${p.n} for factorial`,
      fix: 'Ensure n is a non-negative integer',
      level: 'warn',
    },
  },
})
```

```ts
// src/logger.ts
import { consoleReporter, createLogger } from 'logs-sdk'
import { diagnostics } from './diagnostics'

export const log = createLogger({ diagnostics: [diagnostics] })
```

```ts
// src/math.ts
import { log } from './logger'

export function divide(a: number, b: number) {
  if (b === 0) log.MATH_E001().throw() // [MATH_E001] Division by zero
  return a / b
}
export function factorial(n: number) {
  if (n < 0) log.MATH_W001({ n }).warn()
  return n <= 1 ? 1 : n * factorial(n - 1)
}
```

TypeScript enforces params; factories are cmd+clickable. Full API (formatters, reporters, custom formatters, `docsBase` as a function, multiple diagnostic sets) lives in the root `README.md`.

## Two rules types won't tell you

**1. Codes are permanent.** Once published, never reuse or reassign a code — downstream users and agents search by code, link to `docs` pages by code, and dispatch on code strings. Renaming `MATH_E001` breaks every hit.

Convention: `PREFIX_XNNNN` where `X` groups by domain — e.g. `B`=build, `R`=runtime, `C`=config, `E`=error, `W`=warn, `D`=deprecation. Pick a scheme and stick to it. Use the `/add-diagnostic` skill to add a new code following the convention.

**2. `fix` is the field agents act on.** Always fill it when the resolution is known — it's the most valuable field for both humans and AI. `why` explains non-obvious causes; `hint` adds supplementary guidance.

## Dev loop — tree-shake from prod, capture in dev

`logs-sdk/unplugin` exposes two plugins that work together:

- `logsSDK.vite()` — AST-marks `defineDiagnostics()`/`createLogger()` calls as `/*#__PURE__*/` and wraps diagnostic usage with a `NODE_ENV` guard, so prod builds tree-shake diagnostic code out entirely.
- `logsSDKServer.vite()` — listens on the Vite WS for diagnostics from the browser (sent by `devReporter`) and writes them as NDJSON to `.diagnostics.log` for the agent to read.

```ts
// vite.config.ts
import { logsSDK, logsSDKServer } from 'logs-sdk/unplugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [logsSDK.vite(), logsSDKServer.vite()],
})
```

```ts
// src/logger.ts
import { consoleReporter, createLogger } from 'logs-sdk'
import { devReporter } from 'logs-sdk/reporters/dev'
import { diagnostics } from './diagnostics'

export const log = createLogger({
  diagnostics: [diagnostics],
  reporters: [consoleReporter, devReporter],
})
```

## References

Read these on-demand when the task calls for them — they are self-contained and don't require the repo or README.

- `references/api-reference.md` — full public surface: `Diagnostic` fields, `Overrides`, all formatters (`plainFormatter`, `ansiFormatter`, `jsonFormatter`), all reporters (`consoleReporter`, `createFetchReporter`, `createFileReporter`, `devReporter`), `CodedError`, registry methods (`codes()`/`has()`/`get()`/`extend()`), raw logger methods, `captureStack`, unplugin options.
- `references/testing.md` — asserting diagnostics in tests: the collector-reporter pattern, `instanceof CodedError`, asserting on structured fields (not formatted strings), testing the registry itself.
- `references/migration.md` — converting existing `throw new Error` / `console.warn` sites to `logs-sdk`: picking the right level, parameterizing messages, preserving `cause`, incremental adoption.
- `references/documentation-site.md` — building the per-code docs pages that `docs:` URLs resolve to: page template, AI-agent-friendly structure, CI sync with `diagnostics.codes()`.

<!-- synced-sha: 7c2392fb4716118fa84b469b01c7eff2c057221e -->
