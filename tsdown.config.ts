import { DtsSnapshot } from 'rolldown-plugin-dts-snapshot'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/formatters/ansi.ts',
    'src/formatters/json.ts',
    'src/code-transform/unplugin.ts',
    'src/code-transform/vite.ts',
    'src/code-transform/rollup.ts',
    'src/code-transform/webpack.ts',
    'src/code-transform/esbuild.ts',
  ],
  dts: true,
  exports: true,
  publint: true,
  plugins: [
    DtsSnapshot(),
  ],
})
