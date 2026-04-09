import { logsSDKServer } from 'logs-sdk/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [logsSDKServer()],
  build: {
    minify: false,
  },
})
