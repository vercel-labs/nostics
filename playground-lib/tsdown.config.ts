import logsSdk from 'logs-sdk/rolldown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  plugins: [
    logsSdk(),
  ],
})
