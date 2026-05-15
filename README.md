# nostics

[![npm version](https://img.shields.io/npm/v/nostics?color=blue)](https://npmx.dev/nostics)
[![CI](https://github.com/vercel-labs/nostics/actions/workflows/ci.yml/badge.svg)](https://github.com/vercel-labs/nostics/actions/workflows/ci.yml)

**Errors and warnings your users — and their agents — can actually act on.**

Every diagnostic is a typed, structured object with a stable code, a clear explanation, a suggested fix, and a docs link. No more grepping log output or guessing what an error means.

```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ sources: /Users/me/projects/my-nuxt-app/nuxt.config.ts:14:3
╰▶ see: https://nuxt.com/e/b2011
```

## Why

Library errors today are strings. Users scan them, agents pattern-match them, and everyone loses context. `nostics` turns each diagnostic into a `Diagnostic` instance — stable code, human `why`, actionable `fix`, structured `sources`, and a per-code docs URL. Humans get a searchable code and a fix in the same glance. Agents get machine-readable fields they can dispatch on directly, instead of regexing message text.

## Quick start

```ts
import { defineDiagnostics, reporterLog } from 'nostics'

const diagnostics = defineDiagnostics({
  docsBase: 'https://nuxt.com/e',
  reporters: [reporterLog],
  codes: {
    NUXT_B2011: {
      why: (p: { src: string }) => `Invalid plugin \`${p.src}\`. src option is required.`,
      fix: 'Pass a string path or an object with a `src` property to `addPlugin()`.',
    },
  },
})

// Report (continues execution) or throw — both are fully typed.
diagnostics.NUXT_B2011.report({ src: pluginPath })
diagnostics.NUXT_B2011.throw({ src: pluginPath })
```

That's it. `diagnostics.NUXT_B2011` is cmd+clickable, TypeScript enforces params at the call site, and the result extends `Error` so it works everywhere an `Error` does.

## Dev reporter — pipe browser diagnostics to a file

Diagnostics that fire in the browser are invisible to terminal-bound agents. The dev reporter solves this: it forwards every diagnostic over Vite's HMR channel to a server-side plugin that appends them to a log file your agent can tail. This is automatically included [by the Claude Code plugin](#claude-code-plugin).

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

```ts
import { nosticsServer } from 'nostics/unplugin'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    nosticsServer.vite({
      logFile: '.nostics.log', // default: .nostics.log
    }),
  ],
})
```

Now every `.report()` / `.throw()` call in the browser is appended to `.nostics.log` as it happens. `reporterLog` still prints to the browser console — `devReporter` runs alongside it, no replacement.

## Features

- **Organized, stable codes** — _cmd+click_ to jump to your organized diagnostics definitions
- **Structured `Diagnostic` instances** — extend `Error`, serialize via `toJSON()`, survive process boundaries
- **Pluggable reporters** — console, file, HTTP, dev (Vite HMR), or your own
- **Pluggable formatters** — plain text, ANSI colors, JSON
- **Zero runtime dependencies**

## Claude Code plugin

Ships with a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/skills) so agents understand the API out of the box — auto-loaded reference skill plus a `/add-diagnostic` command for scaffolding new codes.

```bash
gh api repos/vercel-labs/nostics/contents/install.sh --jq '.content' | base64 -d | bash
```

## License

[Apache 2.0](./LICENSE)
