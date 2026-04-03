import { DtsSnapshot } from 'rolldown-plugin-dts-snapshot'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/formatters/ansi.ts',
    'src/formatters/json.ts',
  ],
  dts: true,
  exports: true,
  publint: true,
  plugins: [
    DtsSnapshot(),
  ],
})
