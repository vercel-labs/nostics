import type { LogsSdkPluginOptions } from './unplugin'
import { unplugin } from './unplugin'

export default unplugin.rolldown as (options?: LogsSdkPluginOptions) => any
