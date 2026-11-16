---
name: nostics
description: "Structured diagnostic code library for JavaScript/TypeScript. Turns errors and other conditions into typed, machine-readable `Diagnostic` instances with stable codes, docs URLs, and actionable fields. Use this skill whenever the project imports `nostics`, or works with `defineDiagnostics`/`defineProdDiagnostics`, the `Diagnostic` class, diagnostic code registries, or structured error handling. Also covers reporters (`createConsoleReporter`, `createFetchReporter` from nostics/reporters/fetch, `createFileReporter` from nostics/reporters/node, `createDevReporter` from nostics/reporters/dev), formatters (`formatDiagnostic`, `ansiFormatter`, `jsonFormatter`), and Vite plugins (`nosticsStrip` from @nostics/unplugin/strip-transform, `nosticsCollector` from @nostics/unplugin/dev-server-collector). Also use when migrating a library's existing `console.warn`/`console.error`/`warn()` helpers or thrown `Error`s to diagnostics: follow `references/migration.md`."
license: MIT
---

# nostics

Each error condition becomes a typed `Diagnostic` (extends `Error`) with a stable code, a docs URL, and an actionable `fix`.

`Diagnostic` fields: `name` and `code` (the code), `message`/`why`, `fix?`, `docs?`, `sources?` (`'file:line:column'`), `cause?`, `data?`, `toJSON()` (to send across process boundaries).

## defineDiagnostics

Returns one callable handle per code. A call builds a new `Diagnostic`, runs all reporters in order, and returns it. `throw` the result to raise (the reporters still run).

```ts
import { createConsoleReporter, defineDiagnostics } from 'nostics'

const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://nuxt.com/e/${code.replace('NUXT_', '').toLowerCase()}`,
  reporters: [/*#__PURE__*/ createConsoleReporter()],
  codes: {
    NUXT_B1001: {
      why: 'Could not compile template.',
      fix: 'Check the template for syntax errors.',
    },
    NUXT_B2011: {
      why: (p: { src: string }) => `Invalid plugin "${p.src}". src option is required.`,
      fix: 'Pass a string path or an object with a `src` to `addPlugin()`.',
    },
    NUXT_R9001: { why: 'message', docs: false },
  },
})
```

- **`docsBase`** `string | (code) => string | undefined`: a string gets `/${code.toLowerCase()}` appended; a function returns the full URL (or `undefined` for no URL).
- **`codes`**: `why` is required and becomes `Error.message`. Optional: `fix`, `docs` (a string overrides `docsBase`, `false` opts out), `data` (typed, included in `toJSON()`). `why`, `fix`, and `data` accept a string/object or a `(params) => ...` function.
- **Params**: the params of `why`, `fix`, and `data` are intersected and required at the call site (`why` needs `{ src }`, `fix` needs `{ date }`: the call needs `{ src, date }`).
- **`reporters`** (optional): run on each call. Their option types are intersected and become the second call-site argument. A catalog whose codes are only thrown needs no reporters: a console reporter prints the message, then the uncaught error shows it again. Keep report-only warnings and thrown errors in separate catalogs.

## Call sites

```ts
diagnostics.NUXT_B1001() // report
diagnostics.NUXT_B2011({ src, cause: err, sources: ['nuxt.config.ts:42:3'] })
diagnostics.NUXT_B2011({ src }, { method: 'error' }) // reporter options second
throw diagnostics.NUXT_B2011({ src }) // report and raise
```

`cause` and `sources` go in the params object. Pass `cause` when you re-raise, and `sources` when the JS stack points inside the library (build/config errors).

To catch:

- `diagnostics.NUXT_B2011.is(err)`: one code, narrows `.data`.
- `diagnostics.is(err)`: any code of the registry. `err.code` is then the union of codes: do not cast it.
- `err instanceof Diagnostic`: any diagnostic.

Do not write `err.code === '...'` guards or your own `isDiagnostic` helpers. For the code union type, use `InferDiagnosticCodes<typeof diagnostics>`, not `keyof typeof diagnostics` (it includes `is`).

## Reporters

`(diagnostic: Diagnostic, options?: Opts) => void`. A required `options` type makes the second call-site argument required.

| Reporter                          | Import                    | Description                                                                                                                                     |
| --------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `createConsoleReporter(options?)` | `nostics`                 | `console[method](formatter(d))`. `method`: `'log'\|'warn'\|'error'` (default `'warn'`, also per call). `formatter`: default `formatDiagnostic`. |
| `createFetchReporter(url)`        | `nostics/reporters/fetch` | POSTs the diagnostic JSON to the URL. Ignores failures.                                                                                         |
| `createFileReporter(options?)`    | `nostics/reporters/node`  | Appends NDJSON to a file (default `.nostics.log`).                                                                                              |
| `createDevReporter()`             | `nostics/reporters/dev`   | Sends `toJSON()` to the Vite dev server with `import.meta.hot.send()`.                                                                          |

```ts
import type { DiagnosticReporter } from 'nostics'
const sentryReporter: DiagnosticReporter = (d) =>
  sentry.captureMessage(d.message, { tags: { code: d.name } })
// makes `diagnostics.X({...}, { priority: 1 })` required
const audited: DiagnosticReporter<{ priority: number }> = (d, o) =>
  audit.log({ name: d.name, priority: o.priority })
```

## Formatters

| Formatter               | Import                    | Description                                                                                    |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `formatDiagnostic`      | `nostics`                 | Plain unicode string. The built-in reporters use it.                                           |
| `ansiFormatter(colors)` | `nostics/formatters/ansi` | Colored. Takes a `Colors` object (`red`/`yellow`/`cyan`/`gray`/`bold`/`dim`, `(s) => string`). |
| `jsonFormatter`         | `nostics/formatters/json` | `JSON.stringify(diagnostic)`.                                                                  |

`formatDiagnostic` output (order `fix`, `sources`, `see`; missing fields are not shown):

```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ fix: Pass a string path or an object with a `src` to `addPlugin()`.
├▶ sources: nuxt.config.ts:42:3
╰▶ see: https://nuxt.com/e/b2011
```

## Build plugins (`@nostics/unplugin`, dev dependency)

unplugin-based: `.vite()`, `.webpack()`, `.rollup()`, `.rolldown()`, etc.

- **`nosticsStrip`** (`@nostics/unplugin/strip-transform`, for library authors): marks `defineDiagnostics()` as `/*#__PURE__*/` and wraps bare diagnostic calls in a `NODE_ENV` guard, so they are removed from production. `throw`/`return`/assigned diagnostics stay. Option `packageName?` (default `'nostics'`). To be tracked, the catalog must be exported directly and imported with a relative path (no factory wrappers, no deep barrels).
- **`nosticsCollector`** (`@nostics/unplugin/dev-server-collector`, for app developers, Vite only): receives `createDevReporter()` diagnostics over the Vite WebSocket and writes them as NDJSON. Options `logFile?` (default `.nostics.log`), `debug?` (default `!!process.env.DEBUG`).

```ts
// vite.config.ts
import { nosticsStrip } from '@nostics/unplugin/strip-transform'
import { nosticsCollector } from '@nostics/unplugin/dev-server-collector'
export default defineConfig({
  plugins: [nosticsStrip.vite(), nosticsCollector.vite()],
})

// src/diagnostics.ts
import { createConsoleReporter, defineDiagnostics } from 'nostics'
import { createDevReporter } from 'nostics/reporters/dev'
export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  reporters: [/*#__PURE__*/ createConsoleReporter(), /*#__PURE__*/ createDevReporter()],
  codes: {/* ... */},
})
```

## Production builds

- **Report-only** calls (bare `diagnostics.X()`) must be removed. Always write `/*#__PURE__*/` before `defineDiagnostics(` and before each reporter factory in it. Then either guard each report-only call (`process.env.NODE_ENV !== 'production' && diagnostics.X(p)`) or let `nosticsStrip` do it. The unused catalog then tree-shakes.
- **Surviving** calls (`throw`/`return`/assigned/argument) keep the full catalog in the bundle, with all `why`/`fix` text. If the library only reports, stop here.

If the library throws in production, select `defineProdDiagnostics` with a `NODE_ENV` ternary. The consumer bundler then removes the dev branch:

```ts
import { defineDiagnostics, defineProdDiagnostics } from 'nostics'
export const diagnostics =
  process.env.NODE_ENV === 'production'
    ? /*#__PURE__*/ defineProdDiagnostics({ docsBase })
    : /*#__PURE__*/ defineDiagnostics({ docsBase, reporters: [/* ... */], codes: {/* ... */} })
```

In prod: `name` is the accessed code, `docs` comes from `docsBase`, `why` is the docs URL (or empty), there is no `why`/`fix` text, and `.data` is `undefined` (so the ternary types `.data` as `Data | undefined`). No reporters by default; pass `reporters` for prod telemetry. `nosticsStrip` tracks this ternary like a direct export.

## Conventions

- **Codes**: `PREFIX_XNNNN`. `X` is the area, not the severity: `B` build, `R` runtime, `C` config, `D` deprecation. Never rename or reuse a published code.
- **`why` is the diagnosis, `fix` is the remedy.** Both are printed, so do not repeat text between them. If the source has one sentence with both, split it. If the remedy needs a value, make `fix` a function. Give a `fix` whenever the solution is known.
- Put runtime values in typed param functions, not in string concatenation at the call site.
- Tests assert the code (`.name`, or `[CODE]` in reporter output), not the message.
- Split large catalogs by domain (`diagnostics/build.ts`, `runtime.ts`, ...), with a shared `docsBase` and separate code ranges.

## References

- `references/migration.md`: migrate a library's `console.warn`/`console.error`/`warn()`/thrown `Error`s to diagnostics without a change in behavior. Follow it start to finish.
- `references/documentation-site.md`: the error-code docs site (page template, deployment, sync with code).
