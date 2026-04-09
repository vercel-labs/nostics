import type { LogsSdkServerOptions } from './server-plugin'
import type { LogsSdkPluginOptions } from './unplugin'
import { logsSDKServer as _logsSDKServer } from './server-plugin'
import { logsSDK } from './unplugin'

export default logsSDK.vite as (options?: LogsSdkPluginOptions) => any
export const logsSDKServer = _logsSDKServer.vite as (options?: LogsSdkServerOptions) => any
