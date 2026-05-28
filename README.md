# nostics

[![npm version](https://img.shields.io/npm/v/nostics?color=blue)](https://npmx.dev/nostics)
[![CI](https://github.com/vercel-labs/nostics/actions/workflows/ci.yml/badge.svg)](https://github.com/vercel-labs/nostics/actions/workflows/ci.yml)

**Errors and warnings your users (and their agents) can actually act on.**

Every diagnostic is a typed, structured object with a stable code, a clear explanation, a suggested fix, and a docs link. No more grepping log output or guessing what an error means.

```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ sources: /Users/me/projects/my-nuxt-app/nuxt.config.ts:14:3
╰▶ see: https://nuxt.com/e/b2011
```

## Why

Library errors today are strings. Users scan them, agents pattern-match them, and everyone loses context. `nostics` turns each diagnostic into a `Diagnostic` instance: stable code, human `why`, actionable `fix`, structured `sources`, and a per-code docs URL. Humans get a searchable code and a fix in the same glance. Agents get machine-readable fields to dispatch on, instead of regexing message text.

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
diagnostics.NUXT_B2011({ src: pluginPath })
throw diagnostics.NUXT_B2011({ src: pluginPath })
```

That's it. `diagnostics.NUXT_B2011` is cmd+clickable, TypeScript checks params at the call site, and the result extends `Error`, so it works anywhere an `Error` does.

## Dev reporter: pipe browser diagnostics to a file

Browser diagnostics are invisible to terminal-bound agents. The dev reporter fixes that: it forwards each diagnostic over Vite's HMR channel to a server-side plugin, which appends them to a log file your agent can tail. The [Claude Code plugin](#claude-code-plugin) sets this up automatically.

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
import { nosticsCollector } from 'nostics/unplugin/dev-server-collector'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    nosticsCollector.vite({
      logFile: '.nostics.log', // default: .nostics.log
    }),
  ],
})
```

> [!WARNING]
> `nosticsCollector` is Vite only. It relies on `configureServer` + `server.ws`, which have no equivalent in other bundlers, so the `.rolldown()`, `.rollup()`, `.webpack()`, `.rspack()`, `.esbuild()`, and `.farm()` adapters are exposed by unplugin but are no-ops here.

Now every diagnostic call in the browser is appended to `.nostics.log` as it happens. `reporterLog` still prints to the browser console. `devReporter` runs alongside it, not as a replacement.

## Features

- **Organized, stable codes.** _cmd+click_ to jump to your organized diagnostics definitions
- **Structured `Diagnostic` instances.** Extend `Error`, serialize via `toJSON()`, survive process boundaries
- **Pluggable reporters.** Console, file, HTTP, dev (Vite HMR), or your own
- **Pluggable formatters.** Plain text, ANSI colors, JSON
- **Zero runtime dependencies**

## Claude Code plugin

Includes a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/skills) so agents learn the API automatically: an auto-loaded reference skill and a `/add-diagnostic` command for scaffolding new codes.

```bash
gh api repos/vercel-labs/nostics/contents/install.sh --jq '.content' | base64 -d | bash
```

## License

[Apache 2.0](./LICENSE)
