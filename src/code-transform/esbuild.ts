import type { LogsSdkPluginOptions } from './unplugin'
import { unplugin } from './unplugin'

export default unplugin.esbuild as (options?: LogsSdkPluginOptions) => any
