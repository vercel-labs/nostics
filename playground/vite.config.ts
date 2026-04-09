import { logsSDKServer } from '@antfu/experimental-logs-sdk/unplugin'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [
    //
    inspect(),
    logsSDKServer.vite(),
  ],
  build: {
    minify: false,
  },
})
