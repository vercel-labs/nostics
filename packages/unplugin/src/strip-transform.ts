import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { TrackedExportsMap, TransformOptions } from './transform'
import { relative } from 'node:path'
import { createUnplugin } from 'unplugin'
import { createCodeRegistry, extractDiagnosticCodes } from './detect-duplicate-codes'
import { transform } from './transform'

export type NosticsStripOptions = TransformOptions

const JS_EXTENSIONS_RE = /\.[jt]sx?$/
const NODE_MODULES_RE = /\/node_modules\//

function formatDuplicate(code: string, files: string[]): string {
  const display = files.map(file => relative(process.cwd(), file) || file)
  return `Duplicate diagnostic code "${code}" defined in: ${display.join(', ')}`
}

const unpluginFactory: UnpluginFactory<NosticsStripOptions | undefined, true> = (options) => {
  const trackedExportsMap: TrackedExportsMap = new Map()
  const registry = createCodeRegistry()
  // Default to the build path (hard error): only a Vite dev server flips this.
  let isBuild = true

  return [
    {
      name: 'nostics:strip-transform',

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
            map: result.map,
          }
        },
      },
    },
    {
      name: 'nostics:detect-duplicate-codes',

      vite: {
        configResolved(config) {
          isBuild = config.command === 'build'
        },
      },

      watchChange(id, change) {
        if (change.event === 'delete')
          registry.remove(id)
      },

      transform: {
        filter: {
          id: {
            include: JS_EXTENSIONS_RE,
            exclude: NODE_MODULES_RE,
          },
        },
        handler(code, id) {
          registry.update(id, extractDiagnosticCodes(code, id, options))
          for (const { code: duplicate, files } of registry.findDuplicatesFor(id)) {
            const message = formatDuplicate(duplicate, files)
            if (isBuild)
              this.error(message)
            else this.warn(message)
          }
        },
      },
    },
  ]
}

/**
 * Build-time AST transform that strips diagnostics from production bundles and
 * reports duplicate diagnostic codes.
 *
 * This is an array of two [unplugin](https://github.com/unjs/unplugin) plugins:
 *
 * - `nostics:strip-transform` marks `defineDiagnostics()` calls as
 *   `/*#__PURE__*\/` and wraps diagnostic call sites with a
 *   `NODE_ENV !== 'production'` guard so they tree-shake out of production
 *   builds.
 * - `nostics:detect-duplicate-codes` extracts the `codes` keys from every
 *   `defineDiagnostics()` call across the module graph and flags any code
 *   defined in more than one file. It warns on a Vite dev server and errors in
 *   every build (so CI fails).
 *
 * Call the adapter for your bundler (`.vite()`, `.rolldown()`, `.rollup()`,
 * `.webpack()`, `.rspack()`, `.esbuild()`, `.farm()`) to obtain the actual
 * plugins. The adapter returns an array; bundlers flatten nested plugin arrays,
 * so it can be dropped straight into the `plugins` list:
 *
 * ```ts
 * // vite.config.ts
 * import { nosticsStrip } from '@nostics/unplugin/strip-transform'
 * export default defineConfig({ plugins: [nosticsStrip.vite()] })
 * ```
 */
export const nosticsStrip: UnpluginInstance<NosticsStripOptions | undefined, true> = createUnplugin<
  NosticsStripOptions | undefined,
  true
>(unpluginFactory)
