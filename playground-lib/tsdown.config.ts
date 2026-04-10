import logsSdk from 'nostics/unplugin'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: true,
  exports: true,
  deps: {
    neverBundle: ['nostics'],
    onlyBundle: [],
  },
  dts: {
    // can't enable due to https://github.com/microsoft/TypeScript/issues/58944#issuecomment-4213203205
    oxc: true,
  },
  plugins: [
    logsSdk.rolldown(),
  ],
})
