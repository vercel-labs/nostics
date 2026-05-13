# logs-sdk

Structured diagnostic codes for JavaScript/TypeScript libraries and frameworks.

`logs-sdk` makes every error, warning, and suggestion a **structured, typed, machine-readable object** — with a stable code, a human explanation, and enough context for an agent to act on it precisely.

## What it looks like

```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ sources: /Users/me/projects/my-nuxt-app/nuxt.config.ts:14:3
╰▶ see: https://nuxt.com/e/b2011
```

Every diagnostic has a **stable code**, a **human-readable explanation** (`why`, mirrored on `Error.message`), and structured fields — `fix`, `sources`, `docs` — that tell you what happened and how to resolve it. The `see` link points to a dedicated documentation page for that error code, with detailed explanations, examples, and common solutions. It should be visited only if more context is needed beyond the concise inline message.

These error messages are designed to be **actionable** — not just telling you what went wrong, but guiding you toward the fix.

## For humans

A code like `NUXT_B2011` is stable and searchable — look it up in docs, find it in source, share it in issues. The structured fields give you immediate guidance: you don't need to search for the error message to find the fix, it's right there. And when you need more detail, the docs link takes you to a dedicated page for that specific error code — with explanations and examples to understand the root cause and how to resolve it.

When library authors define diagnostics in one place, messages stay consistent. Every occurrence of `NUXT_B2011` produces the same explanation, the same fix, the same docs link.

## For AI agents

Structured diagnostics enable a different kind of agent integration — **precise rather than probabilistic**.

Every diagnostic has a stable code an agent can dispatch on directly, instead of pattern-matching on message text. The `Diagnostic` instance carries everything needed to act: what happened (`why` / `Error.message`), how to fix it (`fix`), where to learn more (`docs`), and machine-readable details (`sources`, `cause`). The per-code documentation pages are equally useful for agents — they can crawl or fetch them for deeper context when the inline fields aren't enough.

An agent can resolve the issue without asking the user for more information. Users don't need to configure anything — if a library uses `logs-sdk`, its diagnostics are already agent-ready. All codes are defined in a catalog, so an agent can enumerate the full error surface ahead of time. And when multiple libraries in a stack adopt it, agents get uniformly structured data from every layer.

## Claude Code plugin

logs-sdk ships a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/skills) that gives agents full context on the diagnostics API.

Run from your project root — the plugin is scoped to the current directory:

```bash
# temporary install because private repo, should be a claude code marketplace in the future
gh api repos/vercel-labs/logs-sdk/contents/install.sh --jq '.content' | base64 -d | bash
```

The plugin includes two skills:

- **logs-sdk** — auto-triggered reference skill. Loaded automatically when Claude Code detects logs-sdk imports or API usage in your project, providing context on `defineDiagnostics`, reporters, formatters, and best practices.
- **`/add-diagnostic`** — user-invocable skill. Guides the agent through adding a new diagnostic code following the `PREFIX_XNNNN` convention, picking the right file, category, and sequence number.

## Usage

### Define diagnostics

`defineDiagnostics()` declares the diagnostic codes for a domain. It returns one handle per code, each with `.report()` and `.throw()`.

`docsBase` can be a string (auto-appends `/${code.toLowerCase()}`) or a function for full control over the URL.

```ts
import { defineDiagnostics, reporterLog } from 'logs-sdk'

const diagnostics = defineDiagnostics({
  docsBase: code => `https://nuxt.com/e/${code.replace('NUXT_', '').toLowerCase()}`,
  reporters: [reporterLog],
  codes: {
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

// Both forms are typed — params are required when `why` or `fix` declare them.
diagnostics.NUXT_B2011.report({ src: pluginPath })
diagnostics.NUXT_B5001.throw({ date: '2025-01-01' })
```

```ts
// String form — simple base URL, code appended automatically.
const diagnostics = defineDiagnostics({
  docsBase: 'https://example.com/errors',
  codes: {
    MY_E001: { why: 'Something went wrong.' },
  },
})
// diagnostics.MY_E001.report().docs → 'https://example.com/errors/my_e001'
```

`diagnostics.NUXT_B2011` is cmd+clickable, TypeScript enforces params at the call site, and the returned `Diagnostic` instance extends `Error` — so it can be inspected, attached as `cause`, or thrown.

### Report vs throw

```ts
// Fires every reporter and returns the diagnostic; execution continues.
const d = diagnostics.NUXT_B2011.report({ src })

// Fires every reporter then throws
diagnostics.NUXT_B2011.throw({ src })
// same as
throw diagnostics.NUXT_B2011.report({ src })
```

### Reporters

Reporters receive each diagnostic. Use the built-ins, write your own, or compose:

```ts
import { defineDiagnostics, reporterError, reporterLog } from 'logs-sdk'
import { createFetchReporter } from 'logs-sdk/reporters/fetch'
import { createFileReporter } from 'logs-sdk/reporters/node'

const diagnostics = defineDiagnostics({
  codes: {
    /* ... */
  },
  reporters: [
    reporterLog,
    createFileReporter({ logFile: '.nostics.log' }),
    createFetchReporter('https://errors.example.com/ingest'),
    (diagnostic) => {
      sentry.captureMessage(diagnostic.message, { tags: { code: diagnostic.name } })
    },
  ],
})
```

A reporter's second parameter declares the options it requires at the call site — `defineDiagnostics` infers and intersects them so `report({...}, { priority: 1 })` is type-checked.

### Formatting

`formatDiagnostic(diagnostic)` produces the multi-line, unicode-decorated string shown above. The `logs-sdk/formatters/ansi` and `logs-sdk/formatters/json` subpaths provide colorized and JSON variants.

## Features

- Typed diagnostic handles — cmd+clickable (go to definition), hover shows params, TypeScript enforces correctness
- Structured `Diagnostic` instances that extend `Error` — serializable via `toJSON()`, transportable across process boundaries
- Pluggable formatters — plain text, ANSI colors, JSON
- Pluggable reporters — console, file, HTTP, dev (Vite HMR), custom
- Reporter-defined options inferred and required at the call site
- Zero runtime dependencies

## License

[MIT](./LICENSE)
