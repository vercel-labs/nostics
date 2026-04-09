import type { LogsSdkPluginOptions } from './unplugin'
import { logsSDK } from './unplugin'

export default logsSDK.rolldown as (options?: LogsSdkPluginOptions) => any
