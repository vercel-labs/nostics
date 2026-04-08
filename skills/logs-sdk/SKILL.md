# logs-sdk

Structured diagnostic code library for JavaScript/TypeScript. Turns every error, warning, suggestion, and deprecation into a typed, machine-readable, serializable `Diagnostic` object with a stable code, docs URL, and actionable fields.

Use when: the project imports `@anthropic/logs-sdk`, `logs-sdk`, or works with `defineDiagnostics`, `createLogger`, `CodedError`, or diagnostic code registries.

## Core Concepts

### Object-first design

The fundamental unit is a plain `Diagnostic` object — serializable, transportable (client-server, worker-main, build tool-IDE). An `Error` class (`CodedError`) is only created at the moment `.throw()` is called.

```ts
interface Diagnostic {
  code: string // e.g. 'B2011'
  prefix?: string // e.g. 'NUXT' → [NUXT_B2011]
  level: 'error' | 'warn' | 'suggestion' | 'deprecation'
  message: string // human-readable, already interpolated
  why?: string // why this happened
  fix?: string // how to resolve it
  hint?: string // additional guidance
  docs?: string // URL to documentation page for this code
  sources?: SourceLocation[]
  cause?: unknown
  context?: Record<string, unknown>
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
  prefix: 'NUXT',
  docsBase: 'https://nuxt.com/e',
  codes: {
    B1001: {
      message: 'Could not compile template.',
      fix: 'Check the template for syntax errors.',
    },
    B2011: {
      message: (p: { src: string }) => `Invalid plugin \`${p.src}\`. src option is required.`,
      fix: 'Pass a string path or an object with a `src` property to `addPlugin()`.',
    },
    B5001: {
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
| `prefix` | `string?` | Namespace prefix (e.g. `'NUXT'` produces `[NUXT_B2011]`) |
| `docsBase` | `string?` | Base URL for docs. Auto-generates `docs` field as `${docsBase}/${code.toLowerCase()}` |
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
diagnostics.B1001()
diagnostics.B1001({ level: 'warn' })

// With params — first arg is params, second is optional overrides
diagnostics.B2011({ src: '/plugins/bad.ts' })
diagnostics.B2011({ src: '/plugins/bad.ts' }, { cause: originalError })
```

**Registry methods** (non-enumerable on the result):

```ts
diagnostics.codes() // → ['B1001', 'B2011', 'B5001']
diagnostics.has('B1001') // → true
diagnostics.get('B1001') // → the raw DiagnosticDefinition
diagnostics.extend({ // → new diagnostics set with additional codes merged in
  B9999: { message: 'New code.' }
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
  reporter: consoleReporter, // default
})
```

**Usage:**

```ts
log.B2011({ src: pluginPath }).throw() // formats, reports, then throws CodedError
log.B1001().warn() // overrides level to 'warn', formats, reports
log.B5001({ date: '2025-01-01' }).log() // uses the definition's level ('warn')
log.B1001().format() // returns the formatted string only

// Raw methods for pre-built Diagnostic objects
log.throw(diagnostics.B2011({ src: pluginPath }))
log.warn(diagnostics.B1001())
```

**Multiple diagnostic sets:**

```ts
const log = createLogger({
  diagnostics: [nuxtDiagnostics, i18nDiagnostics],
})

log.B2011({ src: pluginPath }).throw() // [NUXT_B2011] ...
log.I001({ locale: 'fr' }).warn() // [I18N_I001] ...
```

### `CodedError` — Error class

Created only when `.throw()` is called. Extends `Error`.

```ts
class CodedError extends Error {
  readonly diagnostic: Diagnostic // the full object
  readonly code: string
  readonly docsUrl?: string
  readonly fix?: string
  readonly why?: string
  readonly hint?: string
}
```

**Catch and inspect:**

```ts
try {
  log.B2011({ src: pluginPath }).throw()
}
catch (err) {
  if (err instanceof CodedError) {
    console.log(err.code) // 'B2011'
    console.log(err.docsUrl) // 'https://nuxt.com/e/b2011'
    console.log(err.diagnostic) // full Diagnostic object
  }
}
```

### Formatters

All implement `Formatter` interface: `{ format: (d: Diagnostic) => string }`.

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
├▶ see: https://nuxt.com/e/b2011
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
╰▶ hint: Check your module's addPlugin() calls
```

Detail line order is fixed: `why` → `see` (docs URL) → `fix` → `hint`. Missing fields are omitted.

### Reporters

All implement `Reporter` interface: `{ report: (d: Diagnostic, formatted: string) => void }`.

| Reporter | Import | Description |
|----------|--------|-------------|
| `consoleReporter` | `logs-sdk` | `console.error` for `'error'` level, `console.warn` for all others |
| `createFetchReporter(url)` | `logs-sdk` | POSTs diagnostic JSON to the given URL |

### Overrides

When calling a factory, you can pass `Overrides` to attach runtime context:

```ts
interface Overrides {
  level?: DiagnosticLevel
  sources?: SourceLocation[]
  cause?: unknown
  context?: Record<string, unknown>
}
```

```ts
diagnostics.B2011({ src: pluginPath }, {
  cause: originalError,
  sources: [{ file: 'nuxt.config.ts', line: 42 }],
  context: { moduleName: 'my-module' },
})
```

## Best Practices

### Code naming conventions

- Use short, stable code identifiers (e.g. `B1001`, `B2011`)
- Group by domain using a letter prefix: `B` for build, `R` for runtime, `C` for config, etc.
- Never reuse or reassign a code once published — codes are permanent identifiers
- Use the `prefix` option to namespace codes by project (e.g. `NUXT`, `VITE`, `I18N`)

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
    build.ts       # B-series codes
    runtime.ts     # R-series codes
    config.ts      # C-series codes
    index.ts       # re-exports and merges all sets
```

Each file calls `defineDiagnostics()` with the same `prefix` and `docsBase` but different code ranges.

## Documentation Site and Error Code Registry

### Why a documentation site matters

Every diagnostic code should have a dedicated, publicly accessible documentation page. This serves three audiences:

1. **Developers** encountering the error in their terminal or logs can click the `see:` URL and get immediate guidance
2. **AI agents** (Claude, Copilot, etc.) can fetch the page content to provide contextual help when a user pastes an error
3. **Search engines** index these pages so developers searching for `[NUXT_B2011]` find the answer directly

### Setting up `docsBase`

The `docsBase` option in `defineDiagnostics()` controls the auto-generated `docs` URL:

```ts
const diagnostics = defineDiagnostics({
  prefix: 'NUXT',
  docsBase: 'https://nuxt.com/e',
  codes: {
    B2011: { message: '...' },
  },
})
// diagnostics.B2011().docs → 'https://nuxt.com/e/b2011'
```

The URL is always `${docsBase}/${code.toLowerCase()}`. Plan your URL structure accordingly.

### Documentation page structure

Each error code page (e.g. `https://nuxt.com/e/b2011`) should follow this structure. The content must be both human-readable and optimized for AI agent consumption — use clear headings, concise language, and structured sections.

#### Required sections

**Title and code identifier**

```markdown
# B2011: Invalid plugin — src option is required

Code: `NUXT_B2011`
Level: error
```

Start with the code and a short human-readable title. Include the fully qualified code (with prefix) and the severity level.

**What this error means**

```markdown
## What this error means

This error occurs when a plugin is registered via `addPlugin()` without providing a
valid `src` path. Nuxt requires every plugin to have a source file so it can be
resolved and included in the build.
```

Explain the error in plain language. Assume the reader has no prior context — describe what the system expected vs what it received. This section is the primary content AI agents will use to explain the error to users.

**Why this happens**

```markdown
## Why this happens

Common causes:

- Passing an object to `addPlugin()` without a `src` property
- Passing `undefined` or `null` as the plugin path
- A module is constructing a plugin object dynamically and the `src` field is missing
  due to a conditional branch or typo
```

List the concrete scenarios that trigger this diagnostic. Use bullet points. Each bullet should be a specific, recognizable situation the developer might be in.

**How to fix it**

```markdown
## How to fix it

Ensure every call to `addPlugin()` includes a valid `src` path:

\```ts
// Wrong
addPlugin({ name: 'my-plugin' })

// Correct
addPlugin({ src: resolve('./runtime/my-plugin'), name: 'my-plugin' })

// Also correct — pass a string directly
addPlugin(resolve('./runtime/my-plugin'))
\```

If the plugin path is computed dynamically, verify the variable is defined before
passing it to `addPlugin()`.
```

Provide concrete code examples showing the wrong pattern and the corrected version. This is the most important section — it should be copy-pasteable.

#### Optional sections

**Additional context**

```markdown
## Additional context

- This validation was added in Nuxt 3.2
- If you are writing a Nuxt module, see the [Module Author Guide](https://nuxt.com/docs/guide/going-further/modules)
- Related codes: [B1001](./b1001) (template compilation), [B3005](./b3005) (module resolution)
```

Link to related documentation, changelog entries, or related diagnostic codes.

**Example diagnostic output**

```markdown
## Example output

\```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ why: The plugin object was passed without a src path
├▶ see: https://nuxt.com/e/b2011
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
╰▶ hint: Check your module's addPlugin() calls
\```
```

Show what the user actually sees in their terminal so they can confirm they're on the right page.

### Page template

Use this template for each error code page:

```markdown
# {CODE}: {Short title}

Code: `{PREFIX}_{CODE}`
Level: {error|warn|suggestion|deprecation}

## What this error means

{Plain-language explanation of the diagnostic. 1-3 sentences.}

## Why this happens

{Bulleted list of concrete scenarios that trigger this diagnostic.}

## How to fix it

{Code examples showing the wrong pattern and the corrected version.}

## Additional context

{Links to related docs, changelog, or related diagnostic codes. Optional.}

## Example output

{Terminal output showing the formatted diagnostic. Optional.}
```

### Deployment recommendations

Host the error code pages on a public URL that matches your `docsBase`:

- **GitHub Pages or static site generator** (VitePress, Nuxt Content, etc.) — create a directory of markdown files, one per code, with a catch-all route at `/e/[code].md`
- **Dedicated `/errors` or `/e` route** in your existing documentation site
- Ensure pages return proper HTTP status codes (200 for valid codes, 404 for unknown codes) so agents and crawlers can distinguish valid codes from missing ones
- Use `<meta>` tags or frontmatter for structured data (code, level, title) to improve agent and search engine consumption
- Keep pages lightweight — avoid heavy JavaScript or SPAs that block content rendering for fetch-based agents

### Keeping docs in sync with code

- Store documentation markdown alongside your diagnostic definitions or in a dedicated `docs/errors/` directory
- Generate an index page listing all codes with their messages and levels
- In CI, validate that every code in `defineDiagnostics()` has a corresponding documentation page — fail the build if a page is missing
- When adding a new diagnostic code, add the documentation page in the same PR

### Optimizing for AI agent consumption

Pages should be structured so that an AI agent fetching the URL can extract the relevant information without ambiguity:

- Use consistent heading hierarchy (`##` for sections)
- Put the most actionable content (fix instructions) early
- Avoid hiding critical information in collapsed sections, tabs, or JavaScript-rendered content
- Include the fully qualified code (`PREFIX_CODE`) in the page title and body so keyword matching works
- Keep code examples self-contained — an agent should be able to suggest the fix from the page content alone
