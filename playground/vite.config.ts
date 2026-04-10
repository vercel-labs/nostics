import vue from '@vitejs/plugin-vue'
import { logsSDKServer } from 'nostics/unplugin'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [
    // multiline
    vue(),
    inspect(),
    logsSDKServer.vite(),
  ],
  build: {
    minify: false,
  },
})
