# @nostics/unplugin

Build-time plugins for [nostics](https://github.com/vercel-labs/nostics), built with [unplugin](https://github.com/unjs/unplugin).

## Install

```bash
pnpm add -D @nostics/unplugin
```

## `@nostics/unplugin/strip-transform`

For library authors: marks `defineDiagnostics()` calls as pure and guards diagnostic call sites with `process.env.NODE_ENV !== 'production'` so diagnostics tree-shake out of production builds.

```ts
// vite.config.ts
import { nosticsStrip } from '@nostics/unplugin/strip-transform'

export default defineConfig({
  plugins: [nosticsStrip.vite()],
})
```

Adapters for other bundlers are available via `.rollup()`, `.rolldown()`, `.webpack()`, `.rspack()`, `.esbuild()`, and `.farm()`.

## `@nostics/unplugin/dev-server-collector`

For app developers: listens on the Vite dev-server WebSocket for diagnostics emitted by `createDevReporter()` in the browser and appends them as NDJSON to a local log file.

```ts
// vite.config.ts
import { nosticsCollector } from '@nostics/unplugin/dev-server-collector'

export default defineConfig({
  plugins: [nosticsCollector.vite()],
})
```

Note: Vite only. Other unplugin adapters are no-ops.

## License

MIT
