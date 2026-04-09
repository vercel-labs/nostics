import logsSdk from 'logs-sdk/rolldown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  exports: true,
  dts: {
    // can't enable due to https://github.com/microsoft/TypeScript/issues/58944#issuecomment-4213203205
    oxc: true,
  },
  plugins: [
    logsSdk(),
  ],
})
