---
name: logs-sdk
description: "Structured diagnostic code library for JavaScript/TypeScript. Turns errors, warnings, suggestions, and deprecations into typed, machine-readable Diagnostic objects with stable codes, docs URLs, and actionable fields. Use this skill whenever the project imports `logs-sdk` or works with `defineDiagnostics`, `createLogger`, `CodedError`, diagnostic code registries, structured error handling, or error code documentation pages. Also use when building custom formatters, reporters, or integrating diagnostic codes into a library or framework."
---

# logs-sdk

Structured diagnostic code library for JavaScript/TypeScript. Every error, warning, suggestion, and deprecation becomes a typed, serializable `Diagnostic` object with a stable code, docs URL, and actionable fields.

## Core Concepts

### Object-first design

The fundamental unit is a plain `Diagnostic` object — serializable, transportable (client-server, worker-main, build tool-IDE). An `Error` class (`CodedError`) is only created at the moment `.throw()` is called.

```ts
interface Diagnostic {
  code: string // e.g. 'NUXT_B2011'
  level: 'error' | 'warn' | 'suggestion' | 'deprecation'
  message: string // human-readable, already interpolated
  why?: string // why this happened
  fix?: string // how to resolve it
  hint?: string // additional guidance
  docs?: string // URL to documentation page for this code
  sources?: SourceLocation[]
  cause?: unknown
  context?: Record<string, unknown>
  stack?: string // captured stack trace (automatic by default)
}
```

### Diagnostic levels

- `error` — something is broken and must be fixed
- `warn` — something may cause issues
- `suggestion` — an improvement the user could make
- `deprecation` — something that will be removed in a future version

## API Reference

### `defineDiagnostics(options)` — Define diagnostic codes

Creates typed factory functions that produce plain `Diagnostic` objects. No side effects, no logging.

```ts
import { defineDiagnostics } from 'logs-sdk'

const diagnostics = defineDiagnostics({
  docsBase: code => `https://nuxt.com/e/${code.replace('NUXT_', '').toLowerCase()}`,
  codes: {
    NUXT_B1001: {
      message: 'Could not compile template.',
      fix: 'Check the template for syntax errors.',
    },
    NUXT_B2011: {
      message: (p: { src: string }) => `Invalid plugin \`${p.src}\`. src option is required.`,
      fix: 'Pass a string path or an object with a `src` property to `addPlugin()`.',
    },
    NUXT_B5001: {
      message: 'Missing compatibilityDate in nuxt.config.',
      fix: (p: { date: string }) => `Add \`compatibilityDate: '${p.date}'\` to your nuxt.config.`,
      hint: 'This ensures consistent behavior across Nuxt versions.',
      level: 'warn',
    },
  },
})
```

**Options:**

| Field | Type | Description |
|-------|------|-------------|
| `docsBase` | `string \| ((code: string) => string \| undefined)?` | Docs URL source. As a string, auto-generates `docs` as `${docsBase}/${code.toLowerCase()}`. As a function, receives the code key and returns the full URL (or `undefined` to omit). |
| `codes` | `Record<string, DiagnosticDefinition>` | Map of code keys to their definitions |

**DiagnosticDefinition fields:**

| Field | Type | Description |
|-------|------|-------------|
| `message` | `string \| (params) => string` | Required. The diagnostic message |
| `fix` | `string \| (params) => string` | Optional. How to resolve the issue |
| `why` | `string \| (params) => string` | Optional. Why this diagnostic was triggered |
| `hint` | `string \| (params) => string` | Optional. Additional contextual guidance |
| `level` | `DiagnosticLevel` | Optional. Defaults to `'error'` |

**Type inference:** Parameters are extracted from ALL template fields (`message`, `fix`, `why`, `hint`) and intersected. If `message` needs `{ src }` and `fix` needs `{ date }`, the factory requires `{ src, date }`.

**Factory usage:**

```ts
// No params — factory takes optional overrides only
diagnostics.NUXT_B1001()
diagnostics.NUXT_B1001({ level: 'warn' })

// With params — first arg is params, second is optional overrides
diagnostics.NUXT_B2011({ src: '/plugins/bad.ts' })
diagnostics.NUXT_B2011({ src: '/plugins/bad.ts' }, { cause: originalError })
```

**Registry methods** (non-enumerable on the result):

```ts
diagnostics.codes() // → ['NUXT_B1001', 'NUXT_B2011', 'NUXT_B5001']
diagnostics.has('NUXT_B1001') // → true (type guard: narrows to known code key)
diagnostics.get('NUXT_B1001') // → the raw DiagnosticDefinition
diagnostics.extend({ // → new diagnostics set with additional codes merged in
  NUXT_B9999: { message: 'New code.' }
})
```

### `createLogger(options)` — Bind diagnostics to output

Merges diagnostic sets and wraps each code factory to return `DiagnosticActions` — a `Diagnostic` enriched with action methods.

```ts
import { consoleReporter, createLogger, plainFormatter } from 'logs-sdk'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'

const log = createLogger({
  diagnostics: [diagnostics],
  formatter: ansiFormatter(colors), // or plainFormatter (default)
  reporter: consoleReporter, // default — pass a single function or an array
  captureStack: true, // default — automatically captures user-land stack traces
})
```

**Stack trace capture:** By default, every `.throw()`, `.warn()`, `.error()`, and `.log()` call captures a stack trace, filtering out `node_modules` and `node:` internals. The trace is attached to the diagnostic's `stack` field. Set `captureStack: false` to disable.

**Usage:**

```ts
log.NUXT_B2011({ src: pluginPath }).throw() // formats, reports, then throws CodedError
log.NUXT_B1001().warn() // overrides level to 'warn', formats, reports
log.NUXT_B5001({ date: '2025-01-01' }).log() // uses the definition's level ('warn')
log.NUXT_B1001().format() // returns the formatted string only

// Raw methods for pre-built Diagnostic objects
log.throw(diagnostics.NUXT_B2011({ src: pluginPath }))
log.warn(diagnostics.NUXT_B1001())
```

**Multiple diagnostic sets:**

```ts
const log = createLogger({
  diagnostics: [nuxtDiagnostics, i18nDiagnostics],
})

log.NUXT_B2011({ src: pluginPath }).throw() // [NUXT_B2011] ...
log.I18N_I001({ locale: 'fr' }).warn() // [I18N_I001] ...
```

**Multiple reporters:**

```ts
const log = createLogger({
  diagnostics: [diagnostics],
  reporter: [
    consoleReporter,
    (diagnostic, formatted) => {
      sentry.captureMessage(formatted, { tags: { code: diagnostic.code } })
    },
  ],
})
```

### `CodedError` — Error class

Created only when `.throw()` is called. Extends `Error` with `name: 'CodedError'`.

```ts
class CodedError extends Error {
  readonly diagnostic: Diagnostic // the full object
}
```

The `message` is formatted as `[CODE] message text`. Access all diagnostic fields via `err.diagnostic`.

**Catch and inspect:**

```ts
try {
  log.NUXT_B2011({ src: pluginPath }).throw()
}
catch (err) {
  if (err instanceof CodedError) {
    console.log(err.diagnostic.code) // 'NUXT_B2011'
    console.log(err.diagnostic.docs) // 'https://nuxt.com/e/b2011'
    console.log(err.diagnostic.fix) // 'Pass a string path...'
  }
}
```

### Formatters

All are plain functions: `(d: Diagnostic) => string`.

| Formatter | Import | Description |
|-----------|--------|-------------|
| `plainFormatter` | `logs-sdk` | Unicode box-drawing, no colors. Default. |
| `ansiFormatter(colors)` | `logs-sdk/formatters/ansi` | Accepts a generic `Colors` interface — no hard ANSI dependency |
| `jsonFormatter` | `logs-sdk/formatters/json` | `JSON.stringify(diagnostic)` |

**ANSI formatter `Colors` interface:**

```ts
interface Colors {
  red: (s: string) => string
  yellow: (s: string) => string
  cyan: (s: string) => string
  gray: (s: string) => string
  bold: (s: string) => string
  dim: (s: string) => string
}
```

**Plain formatter output:**

```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ why: The plugin object was passed without a src path
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ hint: Check your module's addPlugin() calls
╰▶ see: https://nuxt.com/e/b2011
```

Detail line order is fixed: `why` → `fix` → `hint` → `see` (docs URL). Missing fields are omitted.

**Writing a custom formatter:**

```ts
import type { Formatter } from 'logs-sdk'

const myFormatter: Formatter = (d) => {
  return `[${d.code}] ${d.message}${d.fix ? ` (fix: ${d.fix})` : ''}`
}
```

### Formatting utilities

Two lower-level functions are exported for building custom formatters:

- `formatTag(d: Diagnostic)` — returns the `[CODE]` tag string (e.g. `[NUXT_B2011]` for code `'NUXT_B2011'`)
- `renderFrame(d: Diagnostic)` — returns the full box-drawing formatted string (same as `plainFormatter`)

### Reporters

All are plain functions: `(d: Diagnostic, formatted: string) => void`. Pass a single reporter or an array.

| Reporter | Import | Description |
|----------|--------|-------------|
| `consoleReporter` | `logs-sdk` | `console.error` for `'error'` level, `console.warn` for all others |
| `createFetchReporter(url)` | `logs-sdk` | POSTs diagnostic JSON to the given URL (silently ignores fetch errors) |
| `createFileReporter(options?)` | `logs-sdk/node-reporter` | Appends diagnostics as NDJSON to a local file (default `.diagnostics.log`) |
| `devReporter` | `logs-sdk/dev-reporter` | Sends diagnostics to Vite dev server via `import.meta.hot.send()` |

**Writing a custom reporter:**

```ts
import type { Reporter } from 'logs-sdk'

const fileReporter: Reporter = (diagnostic, formatted) => {
  fs.appendFileSync('errors.log', `${formatted}\n`)
}
```

### Overrides

When calling a factory, you can pass `Overrides` to attach runtime context:

```ts
type Overrides = Partial<Pick<Diagnostic, 'level' | 'sources' | 'cause' | 'context'>>
```

```ts
diagnostics.NUXT_B2011({ src: pluginPath }, {
  cause: originalError,
  sources: [{ file: 'nuxt.config.ts', line: 42 }],
  context: { moduleName: 'my-module' },
})
```

## Subpath Exports

Beyond the main `logs-sdk` entry point, three additional subpath exports are available:

### `logs-sdk/node-reporter` — File-based logging

Exports `createFileReporter(options?)`, a reporter that appends each diagnostic as a JSON line (NDJSON) to a local file. Useful for server-side logging alongside `consoleReporter`.

```ts
import { createFileReporter } from 'logs-sdk/node-reporter'

const log = createLogger({
  diagnostics: [diagnostics],
  reporter: [consoleReporter, createFileReporter()],
})
```

Options: `{ logFile?: string }` — defaults to `'.diagnostics.log'`.

### `logs-sdk/dev-reporter` — Vite HMR reporter

Exports `devReporter`, a reporter that sends diagnostics to the Vite dev server via `import.meta.hot.send()`. Used on the client side during development to relay diagnostics back to the server.

```ts
import { devReporter } from 'logs-sdk/dev-reporter'

const log = createLogger({
  diagnostics: [diagnostics],
  reporter: [consoleReporter, devReporter],
})
```

### `logs-sdk/unplugin` — Build-time plugin

Exports `logsSDK` (build plugin) and `logsSDKServer` (server plugin) for Vite/Webpack/Rollup via unplugin.

**Build plugin (`logsSDK`):**
- Adds `/*#__PURE__*/` annotations to `defineDiagnostics()` and `createLogger()` calls for tree-shaking
- Wraps logger usage statements with `process.env.NODE_ENV !== 'production' &&` guards so they are eliminated in production builds
- Handles cross-file tracking: if a module imports a logger variable created in another file, its usage is also wrapped

**Server plugin (`logsSDKServer`):**
- Listens for diagnostics sent via Vite HMR websocket (from `devReporter`)
- Writes received diagnostics to a log file using `createFileReporter`
- Initializes the log file on dev server start

```ts
// vite.config.ts
import { logsSDK, logsSDKServer } from 'logs-sdk/unplugin'

export default defineConfig({
  plugins: [
    logsSDK.vite(),
    logsSDKServer.vite(),
  ],
})
```

## Best Practices

### Code naming conventions

- Use fully qualified, stable code identifiers (e.g. `NUXT_B1001`, `I18N_I001`)
- Group by domain using a letter prefix within the code: `B` for build, `R` for runtime, `C` for config, etc.
- Never reuse or reassign a code once published — codes are permanent identifiers

### Structuring diagnostic definitions

- Always provide `message` — it is the only required field
- Provide `fix` whenever the solution is known — this is the most actionable field for both humans and AI agents
- Provide `why` to explain root causes when the reason may not be obvious from the message alone
- Use `hint` for supplementary guidance that doesn't fit in `fix` (e.g. links to related docs, edge cases)
- Set the appropriate `level` — default is `'error'`, override to `'warn'`, `'suggestion'`, or `'deprecation'` as needed
- Use parameterized templates for messages that include runtime values — avoid string concatenation outside the factory

### Organizing diagnostic files

For large projects, split diagnostics by domain:

```
src/
  diagnostics/
    build.ts       # NUXT_B-series codes
    runtime.ts     # NUXT_R-series codes
    config.ts      # NUXT_C-series codes
    index.ts       # re-exports and merges all sets
```

Each file calls `defineDiagnostics()` with the same `docsBase` but different code ranges.

## Documentation Site

For guidance on building error code documentation pages (structure, templates, deployment, and AI-agent optimization), read `references/documentation-site.md`.
