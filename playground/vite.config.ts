import { DevTools } from '@vitejs/devtools'
import vue from '@vitejs/plugin-vue'
import { nosticsServer } from 'nostics/unplugin'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'

export default defineConfig(({ command }) => ({
  devtools: command === 'serve',
  plugins: [
    // multiline
    command === 'serve' && DevTools(),
    vue(),
    inspect(),
    nosticsServer.vite(),
  ],
  build: {
    minify: false,
  },
}))
