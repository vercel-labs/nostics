import { DtsSnapshot } from 'rolldown-plugin-dts-snapshot'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'formatters/ansi': 'src/formatters/ansi.ts',
    'formatters/json': 'src/formatters/json.ts',
    'unplugin': 'src/code-transform/unplugin.ts',
    'vite': 'src/code-transform/vite.ts',
    'rolldown': 'src/code-transform/rolldown.ts',
  },
  dts: true,
  exports: true,
  publint: true,
  plugins: [
    DtsSnapshot(),
  ],
})
