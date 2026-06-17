import type { UserConfig } from 'tsdown'
import { nosticsStrip } from '@nostics/unplugin/strip-transform'
import { defineConfig } from 'tsdown'

const commonConfig = {
  entry: ['src/index.ts'],
  sourcemap: true,
  deps: {
    neverBundle: ['nostics'],
    onlyBundle: [],
  },
  dts: {
    // can't enable due to https://github.com/microsoft/TypeScript/issues/58944#issuecomment-4213203205
    oxc: true,
  },
  plugins: [nosticsStrip.rolldown()],
} satisfies UserConfig

export default defineConfig([
  {
    ...commonConfig,
    exports: true,
    clean: true,
  },
  {
    ...commonConfig,
    exports: false,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    outputOptions: {
      entryFileNames: '[name].min.js',
    },
    dts: false,
    minify: true,
  },
])
