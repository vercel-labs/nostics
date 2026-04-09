# Plan: `logs-sdk` — Structured Diagnostic Code Library

## Core Design: Object-First

The fundamental data structure is a **plain diagnostic object** — serializable, transportable across process boundaries (client → server, worker → main, build tool → IDE). The `Error` class is only created at the moment of throwing.

```ts
interface Diagnostic {
  code: string // e.g., 'NUXT_B2011'
  level: 'error' | 'warn' | 'suggestion' | 'deprecation'
  message: string // resolved message (already interpolated)
  why?: string // why it happened
  fix?: string // how to fix it
  hint?: string // additional hint
  docs?: string // documentation URL
  sources?: SourceLocation[]
  cause?: unknown
  context?: Record<string, unknown> // machine-readable details
}
```

This object is what gets:
- Passed to formatters for console output
- Sent over HTTP to a dev server
- Stored in an error overlay
- Read by an AI agent
- Converted to an `Error` only when `throw()` is called

---

## API Design

### 1. `defineDiagnostics()` — Pure data + typed factories

Defines the diagnostic codes for a domain. Owns identity (docsBase) and produces plain `Diagnostic` objects. No side effects, no logging.

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

Each code key is a factory function returning a plain `Diagnostic`:

```ts
// diagnostics.NUXT_B2011 is: (params: { src: string }, overrides?) => Diagnostic
// diagnostics.NUXT_B1001 is: (overrides?) => Diagnostic

const diag = diagnostics.NUXT_B2011({ src: pluginPath })
// → { code: 'NUXT_B2011', docs: 'https://nuxt.com/e/b2011', message: '...', ... }
```

- **`diagnostics.NUXT_B2011` is cmd+clickable** — navigates straight to the definition
- **Hover shows the type** — `(params: { src: string }, overrides?: Overrides) => Diagnostic`
- **TypeScript enforces params** — `diagnostics.NUXT_B2011()` is a type error
- **The result is a plain `Diagnostic` object** — fully serializable, no methods

**Typing under the hood:**

```ts
type DiagnosticsResult<T> = {
  [K in keyof T]: T[K] extends { message: (p: infer P) => string }
    ? (params: P, overrides?: Overrides) => Diagnostic // params required
    : (overrides?: Overrides) => Diagnostic // no params
} & DiagnosticsMethods<T>

interface DiagnosticsMethods<T> {
  codes: () => (keyof T)[]
  has: (code: string) => boolean
  get: (code: keyof T) => DiagnosticDefinition
  extend: <U>(defs: U) => DiagnosticsResult<T & U>
}
```

**Edge case — when `fix` or other fields also need params:**

The type extracts params from ALL template fields (`message`, `fix`, `why`, `hint`) and unions them:
```ts
NUXT_B5001: {
  message: 'Missing compatibilityDate.',
  fix: (p: { date: string }) => `Add compatibilityDate: '${p.date}'`,
}
// → diagnostics.NUXT_B5001 requires (params: { date: string }) because fix needs it
```

### 2. `createLogger()` — Bind diagnostics to output

The logger brings together diagnostics and output configuration. Each code key on the logger returns a `DiagnosticActions` — a `Diagnostic` enriched with action methods.

```ts
import { createLogger } from 'logs-sdk'

const log = createLogger({
  diagnostics: [diagnostics],
  formatter: ansiFormatter(colors),
  reporter: consoleReporter,
})
```

**Usage — chainable actions:**

```ts
log.NUXT_B2011({ src: pluginPath }).throw()
log.NUXT_B1001().warn()
log.NUXT_B5001({ date: '2025-01-01' }).log() // uses the level from the definition ('warn')
```

**Multiple diagnostic sets:**

```ts
const i18nDiagnostics = defineDiagnostics({
  docsBase: 'https://i18n.nuxtjs.org/e',
  codes: {
    I18N_I001: {
      message: (p: { locale: string }) => `Missing translations for locale "${p.locale}".`,
      fix: 'Add a translation file for this locale.',
    },
  },
})

const log = createLogger({
  diagnostics: [diagnostics, i18nDiagnostics],
  formatter: ansiFormatter(colors),
  reporter: consoleReporter,
})

log.NUXT_B2011({ src: pluginPath }).throw() // [NUXT_B2011] ...
log.I18N_I001({ locale: 'fr' }).warn() // [I18N_I001] ...
```

**What `createLogger()` returns:**

```ts
type Logger<Diagnostics> = MergedFactories<Diagnostics> & LoggerMethods

interface LoggerMethods {
  throw: (diagnostic: Diagnostic) => never
  warn: (diagnostic: Diagnostic) => void
  error: (diagnostic: Diagnostic) => void
  log: (diagnostic: Diagnostic) => void
  format: (diagnostic: Diagnostic) => string
}
```

Each merged code key becomes a factory returning `DiagnosticActions`:

```ts
interface DiagnosticActions extends Diagnostic {
  throw: () => never
  warn: () => void
  error: () => void
  log: () => void // uses diagnostic's own level
  format: () => string
}
```

**Logger also works with raw `Diagnostic` objects** for ad-hoc use:

```ts
log.warn(diagnostics.NUXT_B1001())
log.throw(diagnostics.NUXT_B2011({ src: pluginPath }))
```

**Default behavior:**

If no formatter/reporter specified, defaults to `plainFormatter` + `consoleReporter`. Works out of the box.

### 3. Formatting and reporting

```ts
interface Formatter {
  format: (diagnostic: Diagnostic) => string
}

interface Reporter {
  report: (diagnostic: Diagnostic, formatted: string) => void
}
```

**Built-in formatters:**
- `plainFormatter` — Unicode box-drawing (default)
- `ansiFormatter(colors)` — generic colors interface, no hard ANSI dependency
- `jsonFormatter` — structured JSON

**Built-in reporters:**
- `consoleReporter` — `console.warn`/`console.error` based on `diagnostic.level`
- `createFetchReporter(url)` — POSTs diagnostic object as JSON

### 4. `CodedError` — Only when throwing

```ts
class CodedError extends Error {
  readonly diagnostic: Diagnostic // the full object, always available
  readonly code: string // shorthand for diagnostic.code
  readonly docsUrl?: string
  readonly fix?: string
  readonly why?: string
  readonly hint?: string
}
```

The `diagnostic` property carries the full structured object. Error handlers can inspect it without parsing the message string.

---

## Output Format

```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ why: The plugin object was passed without a src path
├▶ see: https://nuxt.com/e/b2011
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
╰▶ hint: Check your module's addPlugin() calls
```

---

## Comparison: Current vs New

```ts
// CURRENT — verbose, untyped, message scattered at call site
buildErrorUtils.throw({
  message: 'Invalid plugin. src option is required',
  code: ErrorCodes.B2011,
  fix: 'Pass a string path or an object with a `src` property.',
})

// NEW — concise, typed, cmd+clickable, chainable
log.NUXT_B2011({ src: pluginPath }).throw()
```

---

## File Structure

```
src/
  index.ts              # Public API exports
  types.ts              # Diagnostic, DiagnosticActions, SourceLocation, Formatter, Reporter, Overrides, etc.
  diagnostics.ts        # defineDiagnostics() — pure data + typed factories → Diagnostic
  logger.ts             # createLogger() — binds diagnostics + formatter + reporter
  error.ts              # CodedError class
  format.ts             # wrapLine(), renderFrame(), plainFormatter
  reporter.ts           # consoleReporter, createFetchReporter
  formatters/
    ansi.ts             # ansiFormatter(colors) — sub-path export
    json.ts             # jsonFormatter
```

Zero runtime dependencies.

---

## Implementation Steps

1. **`src/types.ts`** — `Diagnostic`, `DiagnosticActions`, `DiagnosticDefinition`, `MessageTemplate`, `SourceLocation`, `Formatter`, `Reporter`, `Overrides`, type utilities (`ExtractParams<T>`)
2. **`src/diagnostics.ts`** — `defineDiagnostics({ docsBase, codes })` — typed factory functions per code, each producing plain `Diagnostic`. `docsBase` accepts a string (auto-appends code) or function (full URL control). Utility methods: `codes()`, `has()`, `get()`, `extend()`.
3. **`src/format.ts`** — Port `wrapLine()` / `renderFrame()`. Implement `plainFormatter`.
4. **`src/error.ts`** — `CodedError` class, constructed from a `Diagnostic` object
5. **`src/reporter.ts`** — `consoleReporter`, `createFetchReporter()`
6. **`src/logger.ts`** — `createLogger({ diagnostics, formatter, reporter })`. Merges diagnostic code keys into action-bearing factories. Also exposes `throw()`, `warn()`, `error()`, `log()`, `format()` for raw `Diagnostic` objects.
7. **`src/formatters/ansi.ts`** — ANSI formatter factory
8. **`src/formatters/json.ts`** — JSON formatter
9. **`src/index.ts`** — Barrel exports

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **`defineDiagnostics()` is pure data** | No side effects, no logger binding. Just factories → plain `Diagnostic` objects. Fully serializable, testable, transportable. |
| **Codes are fully qualified identifiers** | `NUXT_B2011`, `I18N_I001` — the code string is the complete, stable identifier. No runtime prefix composition. |
| **`createLogger()` binds diagnostics + output** | One call sets up everything. No intermediate binding step. |
| **Multiple diagnostics via array** | `diagnostics: [nuxt, i18n]` — flat namespace, each code is globally unique. |
| **Logger has both code keys and raw methods** | `log.NUXT_B2011({...}).throw()` for typed use, `log.throw(diag)` for ad-hoc use. |
| **Actions are fire-and-forget** | `log.NUXT_B2011({...}).throw()` — no holding references. Transport (dev server, Sentry) is handled by reporters. |
| **Params unioned from all template fields** | If `fix` needs `{ date }` and `message` needs `{ src }`, the factory requires both. |
| **Levels beyond error** | `warn`, `suggestion`, `deprecation` — not just an error library. |

---

## Verification

1. Unit tests for `defineDiagnostics()` (pure data factories), `createLogger()`, formatters, reporters
2. Type tests: TS errors for invalid codes, missing params, wrong param types
3. Type tests: cmd+click navigation works (factory references, not strings)
4. `extend()` on diagnostics merges correctly, preserves type safety
5. Multiple diagnostics in `createLogger()` merge correctly
6. Formatted output matches expected box-drawing format
7. `CodedError.diagnostic` carries full structured data
8. Reporter receives full `Diagnostic` object for transport (fetch, Sentry, etc.)
9. Tree-shaking: unused diagnostics excluded from bundle
10. Chained API: `log.NUXT_B2011({ src }).throw()` throws `CodedError`
11. Logger raw methods: `log.warn(diagnostics.NUXT_B2011({ src }))` works
