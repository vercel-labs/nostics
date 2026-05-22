import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { TrackedExportsMap, TransformOptions } from './transform'
import { createUnplugin } from 'unplugin'
import { transform } from './transform'

export type NosticsStripOptions = TransformOptions

const JS_EXTENSIONS_RE = /\.[jt]sx?$/
const NODE_MODULES_RE = /\/node_modules\//

const unpluginFactory: UnpluginFactory<NosticsStripOptions | undefined> = (options) => {
  const trackedExportsMap: TrackedExportsMap = new Map()

  return {
    name: 'nostics',

    transform: {
      filter: {
        id: {
          include: JS_EXTENSIONS_RE,
          exclude: NODE_MODULES_RE,
        },
      },
      handler(code, id) {
        const result = transform(code, id, options, trackedExportsMap)
        if (!result)
          return
        return {
          code: result.code,
          map: result.map as any,
        }
      },
    },
  }
}

/**
 * Build-time AST transform that strips diagnostics from production bundles.
 *
 * Marks `defineDiagnostics()` calls as `/*#__PURE__*\/` and wraps diagnostic
 * call sites with a `NODE_ENV !== 'production'` guard so they tree-shake out
 * of production builds.
 *
 * This is an [unplugin](https://github.com/unjs/unplugin) instance. Call the
 * adapter for your bundler (`.vite()`, `.rolldown()`, `.rollup()`, `.webpack()`,
 * `.rspack()`, `.esbuild()`, `.farm()`) to obtain the actual plugin:
 *
 * ```ts
 * // vite.config.ts
 * import { nosticsStrip } from 'nostics/unplugin/strip-transform'
 * export default defineConfig({ plugins: [nosticsStrip.vite()] })
 * ```
 */
export const nosticsStrip: UnpluginInstance<NosticsStripOptions | undefined>
  /* #__PURE__ */ = createUnplugin<NosticsStripOptions | undefined>(unpluginFactory)
export default nosticsStrip
