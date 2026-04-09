import type { UnpluginFactory } from 'unplugin'
import type { TrackedExportsMap, TransformOptions } from './transform'
import { createUnplugin } from 'unplugin'
import { transform } from './transform'

export type LogsSdkPluginOptions = TransformOptions

const JS_EXTENSIONS_RE = /\.[jt]sx?$/
const NODE_MODULES_RE = /\/node_modules\//

const unpluginFactory: UnpluginFactory<LogsSdkPluginOptions | undefined> = (options) => {
  const trackedExportsMap: TrackedExportsMap = new Map()

  return {
    name: 'logs-sdk',

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

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)
export default unplugin
