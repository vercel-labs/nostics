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
    'dev-reporter': 'src/dev-reporter.ts',
  },
  dts: {
    enabled: true,
    // NOTE: cannot use isolatedDeclarations
    // https://github.com/microsoft/TypeScript/issues/58944#issuecomment-4213203205
    oxc: true,
  },
  exports: true,
  publint: true,
  plugins: [
    DtsSnapshot(),
  ],
})
