import type { Reporter } from './types'

export const devReporter: Reporter = {
  report() {
    console.warn('[logs-sdk] Dev server not active. Add logsSDKServer() plugin to your app Vite config.')
  },
}
