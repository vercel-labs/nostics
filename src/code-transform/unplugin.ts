import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { TrackedExportsMap, TransformOptions } from './transform'
import { createUnplugin } from 'unplugin'
import { transform } from './transform'

export type LogsSdkPluginOptions = TransformOptions

const JS_EXTENSIONS_RE = /\.[jt]sx?$/
const NODE_MODULES_RE = /\/node_modules\//

const unpluginFactory: UnpluginFactory<LogsSdkPluginOptions | undefined> = (options) => {
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

export const logsSDK: UnpluginInstance<LogsSdkPluginOptions | undefined> = /* #__PURE__ */ createUnplugin<LogsSdkPluginOptions | undefined>(unpluginFactory)
export default logsSDK

export { logsSDKServer } from './server-plugin'
export type { LogsSdkServerOptions } from './server-plugin'
