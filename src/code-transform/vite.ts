import type { LogsSdkPluginOptions } from './unplugin'
import { unplugin } from './unplugin'

export default unplugin.vite as (options?: LogsSdkPluginOptions) => any
