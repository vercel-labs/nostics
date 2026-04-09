import type { LogsSdkPluginOptions } from './unplugin'
import { unplugin } from './unplugin'

export default unplugin.rollup as (options?: LogsSdkPluginOptions) => any
