# nostics

[![npm version](https://img.shields.io/npm/v/nostics?color=blue)](https://npmx.dev/nostics)
[![CI](https://github.com/vercel-labs/nostics/actions/workflows/ci.yml/badge.svg)](https://github.com/vercel-labs/nostics/actions/workflows/ci.yml)

Errors worth reading.

`nostics` helps you replace ad hoc error strings with stable diagnostic codes, actionable fixes, source locations, and docs links.

```txt
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ sources: nuxt.config.ts:14:3
╰▶ see: https://nuxt.com/e/b2011
```

## Install

```bash
pnpm add nostics
```

## Quick start

```ts
import { defineDiagnostics, reporterLog } from 'nostics'

export const diagnostics = defineDiagnostics({
  docsBase: code => `https://nuxt.com/e/${code.replace('NUXT_', '').toLowerCase()}`,
  reporters: [reporterLog],
  codes: {
    NUXT_B2011: {
      why: (p: { src: string }) => `Invalid plugin \`${p.src}\`. src option is required.`,
      fix: 'Pass a string path or an object with a `src` property to `addPlugin()`.',
    },
    NUXT_B5001: {
      why: (p: { configPath: string }) => `Missing compatibilityDate in ${p.configPath}.`,
      fix: (p: { date: string }) => `Add \`compatibilityDate: '${p.date}'\` to your config.`,
    },
  },
})
```

Use the generated handles where the problem happens:

```ts
diagnostics.NUXT_B2011({
  src: '/plugins/bad.ts',
  sources: ['nuxt.config.ts:14:3'],
})

throw diagnostics.NUXT_B5001({
  configPath: 'nuxt.config.ts',
  date: '2024-04-03',
})
```

Calling a handle reports the diagnostic and returns a `Diagnostic`. Throwing the return value raises it. The params are inferred from your `why` and `fix` functions.

## Why use it

- Stable codes that users can search and docs can link to.
- Typed params at the call site.
- `Diagnostic` instances that extend `Error`.
- Built-in console, file, fetch, and Vite dev reporters.
- Plain, ANSI, and JSON formatters.
- A build plugin that strips report-only diagnostics from production bundles.

The structured shape also makes diagnostics easier for tools and coding agents to read, without making that the main workflow.

## Vite plugins

For library builds, use the strip plugin:

```ts
import { nosticsStrip } from 'nostics/unplugin/strip-transform'

export default defineConfig({
  plugins: [nosticsStrip.vite()],
})
```

For browser diagnostics during Vite dev, use `devReporter` in the browser and `nosticsCollector` in the consuming app:

```ts
import { nosticsCollector } from 'nostics/unplugin/dev-server-collector'

export default defineConfig({
  plugins: [nosticsCollector.vite()],
})
```

## Docs

See the docs site for the guide, production build notes, dev collector setup, and API reference.

## License

[MIT](./LICENSE)
