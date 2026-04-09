import type { LogsSdkPluginOptions } from './unplugin'
import { unplugin } from './unplugin'

export default unplugin.webpack as (options?: LogsSdkPluginOptions) => any
