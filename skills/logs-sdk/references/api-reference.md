# API Reference

Complete public surface of `logs-sdk`. The quick-start in `SKILL.md` covers the common path; this file covers the rest.

## `Diagnostic` — the plain object

```ts
interface Diagnostic {
  code: string                        // 'MATH_E001'
  level: 'error' | 'warn' | 'suggestion' | 'deprecation'
  message: string                     // already interpolated
  why?: string                        // root cause / rationale
  fix?: string                        // how to resolve
  hint?: string                       // supplementary guidance
  docs?: string                       // URL; auto-generated from docsBase
  sources?: SourceLocation[]          // { file?, line?, column? }
  cause?: unknown                     // original error, propagated to CodedError.cause
  context?: Record<string, unknown>   // machine-only metadata; not rendered
  stack?: string                      // auto-captured unless captureStack: false
}
```

Diagnostics are serializable — safe to `JSON.stringify`, send across workers/processes, persist, replay. A `CodedError` is only constructed when you call `.throw()`.

## `defineDiagnostics(options)`

```ts
import { defineDiagnostics } from 'logs-sdk'

const diagnostics = defineDiagnostics({
  docsBase: 'https://example.com/errors', // string | (code) => string | undefined
  codes: {
    MATH_E001: { message: 'Division by zero', fix: '...' },
    MATH_W001: {
      message: (p: { n: number }) => `Negative input ${p.n}`,
      fix: 'Ensure n is non-negative',
      level: 'warn',
    },
  },
})
```

**`docsBase`**

- String: `docs = \`${docsBase}/${code.toLowerCase()}\``
- Function: `docs = docsBase(code)`; return `undefined` to omit the URL for that code
- Omitted: `docs` is undefined on every diagnostic

**`DiagnosticDefinition` fields**

| Field     | Type                           | Notes                                  |
| --------- | ------------------------------ | -------------------------------------- |
| `message` | `string \| (params) => string` | Required.                              |
| `fix`     | `string \| (params) => string` | The field agents act on. Fill it when known. |
| `why`     | `string \| (params) => string` | Root cause; useful when non-obvious.    |
| `hint`    | `string \| (params) => string` | Supplementary guidance.                 |
| `level`   | `DiagnosticLevel`              | Defaults to `'error'`.                  |

**Param inference** — TypeScript extracts the `params` type from **every** template field that is a function, then intersects them. If `message` needs `{ src }` and `fix` needs `{ date }`, the factory requires `{ src, date }`. No function templates → the factory takes only an optional `Overrides` argument.

### Factory calls

```ts
diagnostics.MATH_E001()                            // no params
diagnostics.MATH_E001({ level: 'warn' })           // overrides only
diagnostics.MATH_W001({ n: -3 })                   // params
diagnostics.MATH_W001({ n: -3 }, { cause: err })   // params + overrides
```

**`Overrides`** — per-call fields attached to the produced `Diagnostic`:

```ts
type Overrides = Partial<Pick<Diagnostic, 'level' | 'sources' | 'cause' | 'context'>>
```

### Registry methods (non-enumerable)

```ts
diagnostics.codes()          // string[] — all registered codes
diagnostics.has('MATH_E001') // type guard: narrows to known key
diagnostics.get('MATH_E001') // raw DiagnosticDefinition
diagnostics.extend({ MATH_E002: { message: '...' } }) // returns a new merged set
```

## `createLogger(options)`

Binds diagnostic sets to a formatter + reporters, and exposes chainable actions on each code.

```ts
import { consoleReporter, createLogger, plainFormatter } from 'logs-sdk'

const log = createLogger({
  diagnostics: [nuxtDiagnostics, i18nDiagnostics], // one or many; codes merged
  formatter: plainFormatter,                       // default; one function
  reporters: consoleReporter,                      // default; function or array
  captureStack: true,                              // default; set false to disable
})
```

| Option         | Type                                           | Default            |
| -------------- | ---------------------------------------------- | ------------------ |
| `diagnostics`  | `DiagnosticsResult[]`                          | required           |
| `formatter`    | `(d: Diagnostic) => string`                    | `plainFormatter`   |
| `reporters`    | `Reporter \| Reporter[]`                       | `consoleReporter`  |
| `captureStack` | `boolean`                                      | `true`             |

**Merging code collisions.** `diagnostics` is processed in order; if two sets share a code, the later set wins. Namespace with prefixes (`NUXT_*`, `I18N_*`) to avoid this.

### Actions on each code

`log.CODE(...)` returns a `DiagnosticActions` — the `Diagnostic` fields plus five methods:

```ts
log.MATH_E001().throw()                        // format → report → throw CodedError (never returns)
log.MATH_W001({ n: -3 }).warn()                // forces level 'warn', formats, reports
log.MATH_E001().error()                        // forces level 'error', formats, reports
log.MATH_W001({ n: -3 }).log()                 // uses the diagnostic's own level
log.MATH_E001().format()                       // returns formatted string, no side effect
```

### Raw methods on the logger

For pre-built `Diagnostic` objects (e.g. received over the wire):

```ts
log.throw(diag)
log.error(diag)
log.warn(diag)
log.log(diag)
log.format(diag)
```

### `captureStack`

When `true` (default), action methods capture a stack trace at the call site and attach it as `diagnostic.stack`. `node_modules/` frames and internal Node frames are filtered out. Disable (`captureStack: false`) in hot paths where the cost matters.

## `CodedError`

Constructed only by `.throw()`.

```ts
class CodedError extends Error {
  readonly name: 'CodedError'
  readonly message: string       // `[CODE] message`
  readonly diagnostic: Diagnostic
  readonly cause?: unknown       // mirrors diagnostic.cause
}
```

```ts
try {
  log.MATH_E001().throw()
}
catch (err) {
  if (err instanceof CodedError) {
    err.diagnostic.code  // 'MATH_E001'
    err.diagnostic.docs  // 'https://example.com/errors/math_e001'
    err.diagnostic.fix   // 'Ensure the denominator is not zero'
  }
}
```

## Formatters

A formatter is any `(d: Diagnostic) => string`.

| Formatter        | Import                      | Behavior                                                        |
| ---------------- | --------------------------- | --------------------------------------------------------------- |
| `plainFormatter` | `logs-sdk`                  | Unicode box-drawing, no colors. Default.                        |
| `ansiFormatter`  | `logs-sdk/formatters/ansi`  | Takes a `Colors` interface; no hard ANSI dependency.            |
| `jsonFormatter`  | `logs-sdk/formatters/json`  | `JSON.stringify(diagnostic)`.                                   |

**Plain output** (detail order is fixed: `why` → `fix` → `hint` → `see`; missing fields omitted):

```
[MATH_E001] Division by zero
├▶ fix: Ensure the denominator is not zero
╰▶ see: https://example.com/errors/math_e001
```

**ANSI** — inject any color lib (picocolors, kleur, chalk):

```ts
import picocolors from 'picocolors'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'

interface Colors {
  red: (s: string) => string
  yellow: (s: string) => string
  cyan: (s: string) => string
  gray: (s: string) => string
  bold: (s: string) => string
  dim: (s: string) => string
}

const formatter = ansiFormatter(picocolors) // picocolors matches the shape
```

Level colors: `error` → red, `warn`/`deprecation` → yellow, `suggestion` → cyan.

**Building your own.** Two lower-level helpers are exported for reuse:

```ts
import { formatTag, renderFrame } from 'logs-sdk'
// formatTag(d)     → '[MATH_E001]'
// renderFrame(d)   → the full plain box-drawing string

import type { Formatter } from 'logs-sdk'
const myFormatter: Formatter = d => `${d.code}: ${d.message}${d.fix ? ` → ${d.fix}` : ''}`
```

## Reporters

A reporter is any `(d: Diagnostic, formatted: string) => void`. Pass one or an array.

| Reporter                   | Import                       | Behavior                                                         |
| -------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `consoleReporter`          | `logs-sdk`                   | `console.error` for `'error'`, `console.warn` for everything else. |
| `createFetchReporter(url)` | `logs-sdk`                   | POSTs `JSON.stringify(diagnostic)` to `url`. Swallows fetch errors. |
| `createFileReporter(opts?)` | `logs-sdk/reporters/node`   | Appends NDJSON to a local file. Default path `.diagnostics.log`. |
| `devReporter`              | `logs-sdk/reporters/dev`     | Sends over Vite HMR (`import.meta.hot.send`). See dev loop in `SKILL.md`. |

**File reporter:**

```ts
import { createFileReporter } from 'logs-sdk/reporters/node'

createFileReporter()                         // -> .diagnostics.log
createFileReporter({ logFile: 'errors.log' })
```

**Custom reporter:**

```ts
import type { Reporter } from 'logs-sdk'

const sentryReporter: Reporter = (diagnostic, formatted) => {
  sentry.captureMessage(formatted, { tags: { code: diagnostic.code, level: diagnostic.level } })
}
```

## Vite / unplugin — `logs-sdk/unplugin`

Two plugins. Both support `.vite() / .rollup() / .webpack() / .rspack() / .esbuild() / .rolldown()` via [unplugin](https://unplugin.unjs.io).

### `logsSDK`

Build-time AST transform. Marks `defineDiagnostics()` and `createLogger()` calls as `/*#__PURE__*/` and wraps diagnostic action calls with a `NODE_ENV !== 'production'` guard — prod bundlers drop the calls entirely, achieving tree-shaking of diagnostic code.

```ts
import { logsSDK } from 'logs-sdk/unplugin'

export default defineConfig({ plugins: [logsSDK.vite()] })
```

| Option        | Type     | Default       | Notes                                                        |
| ------------- | -------- | ------------- | ------------------------------------------------------------ |
| `packageName` | `string` | `'logs-sdk'`  | Change if re-exporting logs-sdk under a vendor package name. |

### `logsSDKServer`

Vite-only. Listens on the Vite WebSocket for diagnostics sent by `devReporter` (from the browser) and appends them to a local NDJSON file for an agent to read.

```ts
import { logsSDKServer } from 'logs-sdk/unplugin'

export default defineConfig({ plugins: [logsSDKServer.vite()] })
```

| Option    | Type      | Default                 | Notes                                                             |
| --------- | --------- | ----------------------- | ----------------------------------------------------------------- |
| `logFile` | `string`  | `.diagnostics.log`      | Resolved against `server.config.root`; file is created on startup. |
| `debug`   | `boolean` | `!!process.env.DEBUG`   | Logs each received diagnostic to the Vite server logger.           |

## Exports — quick index

```ts
// Main
import {
  defineDiagnostics, createLogger,
  consoleReporter, createFetchReporter,
  plainFormatter, formatTag, renderFrame,
  CodedError,
} from 'logs-sdk'
import type {
  Diagnostic, DiagnosticLevel, DiagnosticDefinition,
  DefineDiagnosticsOptions, CodeFactory, DiagnosticsResult, DiagnosticsMethods,
  Overrides, SourceLocation,
  CreateLoggerOptions, Logger, LoggerMethods, DiagnosticActions, MergeFactories,
  Formatter, Reporter,
} from 'logs-sdk'

// Subpaths
import { ansiFormatter, type Colors } from 'logs-sdk/formatters/ansi'
import { jsonFormatter } from 'logs-sdk/formatters/json'
import { createFileReporter, type FileReporterOptions } from 'logs-sdk/reporters/node'
import { devReporter } from 'logs-sdk/reporters/dev'
import {
  logsSDK, logsSDKServer,
  type LogsSdkPluginOptions, type LogsSdkServerOptions,
} from 'logs-sdk/unplugin'
```
