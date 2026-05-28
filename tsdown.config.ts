import { defineConfig } from 'tsdown'
import ApiSnapshot from 'tsnapi/rolldown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'formatters/ansi': 'src/formatters/ansi.ts',
    'formatters/json': 'src/formatters/json.ts',
    'unplugin/strip-transform': 'src/unplugin/strip-transform.ts',
    'unplugin/dev-server-collector': 'src/unplugin/dev-server-collector.ts',
    'reporters/dev': 'src/reporters/dev.ts',
    'reporters/node': 'src/reporters/node.ts',
    'reporters/fetch': 'src/reporters/fetch.ts',
  },
  dts: {
    enabled: true,
    // NOTE: cannot use isolatedDeclarations
    // https://github.com/microsoft/TypeScript/issues/58944#issuecomment-4213203205
    oxc: true,
  },
  deps: {
    // virtual module so we can warn if plugin is missing during dev
    neverBundle: ['nostics/reporters/dev'],
    onlyBundle: [],
  },
  target: 'esnext',
  sourcemap: true,
  exports: true,
  publint: true,
  plugins: [ApiSnapshot()],
})
