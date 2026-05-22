---
name: nostics
description: 'Structured diagnostic code library for JavaScript/TypeScript. Turns errors and other conditions into typed, machine-readable `Diagnostic` instances with stable codes, docs URLs, and actionable fields. Use this skill whenever the project imports `nostics`, or works with `defineDiagnostics`, the `Diagnostic` class, diagnostic code registries, or structured error handling. Also covers reporters (`reporterLog`, `reporterError`, `createFetchReporter` from nostics/reporters/fetch, `createFileReporter` from nostics/reporters/node, `devReporter` from nostics/reporters/dev), formatters (`formatDiagnostic`, `ansiFormatter`, `jsonFormatter`), and Vite plugins (`nosticsStrip` from nostics/unplugin/strip-transform, `nosticsCollector` from nostics/unplugin/dev-server-collector).'
---

# nostics

Structured diagnostic code library for JavaScript/TypeScript. Every error condition becomes a typed `Diagnostic` (extending `Error`) with a stable code, docs URL, and actionable fields. Serializable via `toJSON()`.

## Core Concepts

### Diagnostic class

The fundamental unit is a `Diagnostic` instance. It extends `Error`, so you can throw it, catch it with `instanceof`, and inspect it like any other error. Use `.toJSON()` to send it across process boundaries.

```ts
class Diagnostic extends Error {
  name: string // the code, e.g. 'NUXT_B2011'
  message: string // human-readable, already interpolated
  get why(): string // alias for `message`
  fix?: string // how to resolve it
  docs?: string // URL to documentation page for this code
  sources?: string[] // 'file:line:column' strings contributed by the call site
  cause?: unknown // original error if passed at call time
  toJSON(): object // plain object with name/why/fix/docs/sources/cause
}
```

### Handles

`defineDiagnostics()` returns one handle per code. Each handle is a plain callable that returns a `Diagnostic` instance: call it to report, `throw` the returned value to raise. Reporters are wired in at definition time and fire on every call.

## API Reference

### `defineDiagnostics(options)`: Define diagnostic codes

```ts
import { defineDiagnostics, reporterLog } from 'nostics'

const diagnostics = defineDiagnostics({
  docsBase: (code) => `https://nuxt.com/e/${code.replace('NUXT_', '').toLowerCase()}`,
  reporters: [reporterLog],
  codes: {
    NUXT_B1001: {
      why: 'Could not compile template.',
      fix: 'Check the template for syntax errors.',
    },
    NUXT_B2011: {
      why: (p: { src: string }) => `Invalid plugin \`${p.src}\`. src option is required.`,
      fix: 'Pass a string path or an object with a `src` property to `addPlugin()`.',
    },
    NUXT_B5001: {
      why: 'Missing compatibilityDate in nuxt.config.',
      fix: (p: { date: string }) => `Add \`compatibilityDate: '${p.date}'\` to your nuxt.config.`,
    },
  },
})
```

**Options:**

| Field       | Type                                         | Description                                                                                                                                                            |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docsBase`  | `string \| ((code) => string \| undefined)?` | Docs URL source. String: auto-generates `docs` as `${docsBase}/${code.toLowerCase()}`. Function: receives the code key, returns the full URL (or `undefined` to omit). |
| `codes`     | `Record<string, DiagnosticDefinition>`       | Map of code keys to their definitions.                                                                                                                                 |
| `reporters` | `readonly DiagnosticReporter[]?`             | Reporters fired on every handle call. Their options are inferred and intersected; required reporter options become required at the call site.                          |

**DiagnosticDefinition fields:**

| Field  | Type                           | Description                                                                                                  |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `why`  | `string \| (params) => string` | Required. Why this failed. Becomes the `Error.message`.                                                      |
| `fix`  | `string \| (params) => string` | Optional. How to resolve the issue.                                                                          |
| `docs` | `string \| false`              | Optional. Per-code docs URL override. `string` replaces `docsBase` for this code; `false` opts out entirely. |

**Per-code docs override:**

```ts
codes: {
  NUXT_B2011: {
    why: 'message',
    docs: 'https://nuxt.com/custom/b2011', // overrides docsBase for this code
  },
  NUXT_W9001: {
    why: 'message',
    docs: false, // opts out — no `see:` line rendered
  },
}
```

**Type inference:** Parameters from all template fields (`why`, `fix`) are intersected. If `why` needs `{ src }` and `fix` needs `{ date }`, the call site requires `{ src, date }`.

### Calling handles: call sites

```ts
// No params — call signature omits the params arg.
diagnostics.NUXT_B1001()

// With params — first arg is the params object.
diagnostics.NUXT_B2011({ src: '/plugins/bad.ts' })

// Runtime call-site fields (`cause`, `sources`) merge into the same object.
diagnostics.NUXT_B2011({
  src: pluginPath,
  cause: originalError,
  sources: ['nuxt.config.ts:42:3'],
})

// To raise instead of just reporting, `throw` the returned diagnostic.
throw diagnostics.NUXT_B2011({ src: pluginPath })
```

The handle returns the `Diagnostic` and fires every reporter in order. `throw` the return value to raise.

### Catching diagnostics

`Diagnostic` extends `Error`, so it behaves like any other thrown error.

```ts
import { Diagnostic } from 'nostics'

try {
  throw diagnostics.NUXT_B2011({ src: pluginPath })
} catch (err) {
  if (err instanceof Diagnostic) {
    console.log(err.name) // 'NUXT_B2011'
    console.log(err.message) // already-interpolated text
    console.log(err.docs) // 'https://nuxt.com/e/b2011'
    console.log(err.fix) // 'Pass a string path...'
  }
}
```

### Formatters

| Formatter               | Import                    | Description                                                     |
| ----------------------- | ------------------------- | --------------------------------------------------------------- |
| `formatDiagnostic`      | `nostics`                 | Plain unicode-decorated string. Used by the built-in reporters. |
| `ansiFormatter(colors)` | `nostics/formatters/ansi` | Colorized variant. Accepts a generic `Colors` interface.        |
| `jsonFormatter`         | `nostics/formatters/json` | `JSON.stringify(diagnostic)` (calls `Diagnostic.toJSON()`).     |

**`formatDiagnostic` output:**

```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ sources: nuxt.config.ts:42:3
╰▶ see: https://nuxt.com/e/b2011
```

Detail line order is fixed: `fix` → `sources` → `see` (docs URL). Missing fields are omitted.

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

### Reporters

A reporter is `(diagnostic: Diagnostic, options?: Opts) => void`. `defineDiagnostics` unions every reporter's `options`. The call site must pass them only if some reporter has required fields.

| Reporter                       | Import                    | Description                                                                                                                    |
| ------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `reporterError`                | `nostics`                 | `console.error(formatDiagnostic(d))`.                                                                                          |
| `reporterLog`                  | `nostics`                 | `console[method](formatDiagnostic(d))`. Method defaults to `'log'`; pass `{ method: 'warn' \| 'error' }` to route differently. |
| `createFetchReporter(url)`     | `nostics/reporters/fetch` | POSTs the diagnostic JSON to the given URL. Fetch failures are swallowed.                                                      |
| `createFileReporter(options?)` | `nostics/reporters/node`  | Appends diagnostics as NDJSON to a local file (default `.nostics.log`).                                                        |
| `devReporter`                  | `nostics/reporters/dev`   | Sends `diagnostic.toJSON()` to the Vite dev server via `import.meta.hot.send()`.                                               |

**Writing a custom reporter:**

```ts
import type { DiagnosticReporter } from 'nostics'

const sentryReporter: DiagnosticReporter = (diagnostic) => {
  sentry.captureMessage(diagnostic.message, { tags: { code: diagnostic.name } })
}
```

To require options at the call site, declare a second parameter:

```ts
const audited: DiagnosticReporter<{ priority: number }> = (d, options) => {
  audit.log({ name: d.name, priority: options.priority })
}
// → diagnostics.X({...}, { priority: 1 }) — the second arg is required and type-checked.
```

## Vite Plugins

Two unplugin-based plugins: `nostics/unplugin/strip-transform` (for library authors, build-time optimization) and `nostics/unplugin/dev-server-collector` (for app developers consuming a nostics-using library, dev-time diagnostic collection).

### `nosticsStrip`: Build-time AST transform

Marks `defineDiagnostics()` calls as `/*#__PURE__*/` and wraps diagnostic usage with a `NODE_ENV` guard, so diagnostics tree-shake out of production builds. Works with `.vite()`, `.webpack()`, `.rollup()`, etc. via unplugin.

```ts
import { nosticsStrip } from 'nostics/unplugin/strip-transform'

export default defineConfig({
  plugins: [nosticsStrip.vite()],
})
```

**Options (`NosticsStripOptions`):**

| Field         | Type      | Description                                                   |
| ------------- | --------- | ------------------------------------------------------------- |
| `packageName` | `string?` | The package name to detect imports from. Default: `'nostics'` |

### `nosticsCollector`: Dev server diagnostic collector

Listens for diagnostics from `devReporter` in the browser over the Vite WebSocket, then writes them as NDJSON to a local log file via `createFileReporter`. Vite-only.

```ts
import { nosticsCollector } from 'nostics/unplugin/dev-server-collector'

export default defineConfig({
  plugins: [nosticsCollector.vite()],
})
```

**Options (`NosticsCollectorOptions`):**

| Field     | Type       | Description                                                         |
| --------- | ---------- | ------------------------------------------------------------------- |
| `logFile` | `string?`  | Path to the log file. Default: `'.nostics.log'`                     |
| `debug`   | `boolean?` | Enable debug logging for the plugin. Default: `!!process.env.DEBUG` |

### Typical dev setup

Use both plugins together with `devReporter` for full dev-time diagnostic capture:

```ts
// vite.config.ts
import { nosticsStrip } from 'nostics/unplugin/strip-transform'
import { nosticsCollector } from 'nostics/unplugin/dev-server-collector'

export default defineConfig({
  plugins: [nosticsStrip.vite(), nosticsCollector.vite()],
})
```

```ts
// src/diagnostics.ts
import { defineDiagnostics, reporterLog } from 'nostics'
import { devReporter } from 'nostics/reporters/dev'

export const diagnostics = defineDiagnostics({
  reporters: [reporterLog, devReporter],
  codes: {
    /* ... */
  },
})
```

## Best Practices

### Code naming conventions

- Use fully qualified, stable code identifiers (e.g. `NUXT_B1001`, `I18N_I001`)
- Group by domain using a letter prefix within the code: `B` for build, `R` for runtime, `C` for config, etc.
- Never reuse or reassign a code once published. Codes are permanent identifiers.

### Structuring diagnostic definitions

- Always provide `why`. It is the only required field and becomes `Error.message`.
- Provide `fix` whenever the solution is known. It is the most actionable field for both humans and AI agents.
- Use parameterized templates for messages that include runtime values. Avoid string concatenation outside the factory.
- Pass `cause` at the call site (not in the definition) when re-raising from an original error
- Pass `sources` at the call site as `'file:line:column'` strings when the JS stack trace doesn't reflect the user's source

### Organizing diagnostic files

For large projects, split diagnostics by domain:

```
src/
  diagnostics/
    build.ts       # NUXT_B-series codes
    runtime.ts     # NUXT_R-series codes
    config.ts      # NUXT_C-series codes
    index.ts       # re-exports each set
```

Each file calls `defineDiagnostics()` with the same `docsBase` but different code ranges.

## Documentation Site

For guidance on building error code documentation pages (structure, templates, deployment, and AI-agent optimization), read `references/documentation-site.md`.
