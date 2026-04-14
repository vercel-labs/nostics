import { defineConfig } from 'tsdown'
import ApiSnapshot from 'tsnapi/rolldown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'formatters/ansi': 'src/formatters/ansi.ts',
    'formatters/json': 'src/formatters/json.ts',
    'unplugin': 'src/code-transform/unplugin.ts',
    'dev-reporter': 'src/dev-reporter.ts',
    'node-reporter': 'src/node-reporter.ts',
  },
  dts: {
    enabled: true,
    // NOTE: cannot use isolatedDeclarations
    // https://github.com/microsoft/TypeScript/issues/58944#issuecomment-4213203205
    oxc: true,
  },
  deps: {
    // virtual module so we can warn if plugin is missing during dev
    neverBundle: ['nostics/dev-reporter'],
    onlyBundle: [],
  },
  target: 'esnext',
  sourcemap: true,
  exports: true,
  publint: true,
  plugins: [
    ApiSnapshot(),
  ],
})
