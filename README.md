# logs-sdk

Structured diagnostic codes for JavaScript/TypeScript libraries and frameworks.

`logs-sdk` makes every error, warning, and suggestion a **structured, typed, machine-readable object** — with a stable code, a human explanation, and enough context for an agent to act on it precisely.

## What it looks like

```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ hint: Check your module's addPlugin() calls
╰▶ see: https://nuxt.com/e/b2011
```

Every diagnostic has a **stable code**, a **human-readable explanation**, and structured fields — `fix`, `why`, `hint`, `docs` — that tell you what happened and how to resolve it. The `see` link points to a dedicated documentation page for that error code, with detailed explanations, examples, and common solutions. It should be visited only if more context is needed beyond the concise inline message.

These error messages are designed to be **actionable** — not just telling you what went wrong, but guiding you toward the fix.

## For humans

A code like `NUXT_B2011` is stable and searchable — look it up in docs, find it in source, share it in issues. The structured fields give you immediate guidance: you don't need to search for the error message to find the fix, it's right there. And when you need more detail, the docs link takes you to a dedicated page for that specific error code — with explanations and examples to understand the root cause and how to resolve it.

When library authors define diagnostics in one place, messages stay consistent. Every occurrence of `NUXT_B2011` produces the same explanation, the same fix, the same docs link.

## For AI agents

Structured diagnostics enable a different kind of agent integration — **precise rather than probabilistic**.

Every diagnostic has a stable code an agent can dispatch on directly, instead of pattern-matching on message text. The object carries everything needed to act: what happened (`message`), why (`why`), how to fix it (`fix`), where to learn more (`docs`), and machine-readable details (`context`, `sources`). The per-code documentation pages are equally useful for agents — they can crawl or fetch them for deeper context when the inline fields aren't enough.

An agent can resolve the issue without asking the user for more information. Users don't need to configure anything — if a library uses `logs-sdk`, its diagnostics are already agent-ready. All codes are defined in a catalog, so an agent can enumerate the full error surface ahead of time. And when multiple libraries in a stack adopt it, agents get uniformly structured data from every layer.

## Claude Code plugin

logs-sdk ships a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/skills) that gives agents full context on the diagnostics API.

Run from your project root — the plugin is scoped to the current directory:

```bash
# temporary install because private repo, should be a claude code marketplace in the future
gh api repos/vercel-labs/logs-sdk/contents/install.sh --jq '.content' | base64 -d | bash
```

The plugin includes two skills:

- **logs-sdk** — auto-triggered reference skill. Loaded automatically when Claude Code detects logs-sdk imports or API usage in your project, providing context on `defineDiagnostics`, `createLogger`, formatters, reporters, and best practices.
- **`/add-diagnostic`** — user-invocable skill. Guides the agent through adding a new diagnostic code following the `PREFIX_XNNNN` convention, picking the right file, category, and sequence number.

## Usage

### Define diagnostics

`defineDiagnostics()` declares the diagnostic codes for a domain — pure data, no side effects.

`docsBase` can be a string (auto-appends `/${code.toLowerCase()}`) or a function for full control over the URL:

```ts
import { defineDiagnostics } from 'logs-sdk'

// Function form — strip the project prefix for cleaner URLs
const diagnostics = defineDiagnostics({
  docsBase: code => `https://nuxt.com/e/${code.replace('NUXT_', '').toLowerCase()}`,
  codes: {
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
// diagnostics.NUXT_B2011({ src: '...' }).docs → 'https://nuxt.com/e/b2011'
```

```ts
// String form — simple base URL, code appended automatically
const diagnostics = defineDiagnostics({
  docsBase: 'https://example.com/errors',
  codes: {
    MY_E001: { message: 'Something went wrong.' },
  },
})
// diagnostics.MY_E001().docs → 'https://example.com/errors/my_e001'
```

### Create a logger

`createLogger()` binds diagnostics to output — formatting and reporting.

```ts
import { createLogger } from 'logs-sdk'

const log = createLogger({
  diagnostics: [diagnostics],
})

log.NUXT_B2011({ src: pluginPath }).throw()
log.NUXT_B5001({ date: '2025-01-01' }).warn()
```

`log.NUXT_B2011` is cmd+clickable, TypeScript enforces params, and actions are chainable — `.throw()`, `.warn()`, `.error()`, `.log()`.

### Multiple diagnostic sets

```ts
const log = createLogger({
  diagnostics: [nuxtDiagnostics, i18nDiagnostics],
})

log.NUXT_B2011({ src: pluginPath }).throw() // [NUXT_B2011] ...
log.I18N_I001({ locale: 'fr' }).warn() // [I18N_I001] ...
```

### Custom reporters

Pass a single reporter function or an array:

```ts
const log = createLogger({
  diagnostics: [diagnostics],
  reporters: [
    consoleReporter,
    (diagnostic, formatted) => {
      sentry.captureMessage(formatted, { tags: { code: diagnostic.code } })
    },
  ],
})
```

## Features

- Typed diagnostic factories — cmd+clickable (go to definition), hover shows params, TypeScript enforces correctness
- Structured `Diagnostic` objects — serializable, transportable across process boundaries
- Chainable actions — `.throw()`, `.warn()`, `.error()`, `.log()`
- Pluggable formatters — plain text, ANSI colors, JSON
- Pluggable reporters — console, HTTP, custom
- Multiple diagnostic sets — compose diagnostics from different libraries
- Zero runtime dependencies

## License

[MIT](./LICENSE)
