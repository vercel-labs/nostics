import { consoleReporter, createLogger } from '@antfu/experimental-logs-sdk'
import { diagnostics } from './diagnostics'

export const log = createLogger({
  diagnostics: [diagnostics],
  reporter: consoleReporter,
})

// TODO: explore this idea

// globalThis.nostics = log
// declare global {
//   // eslint-disable-next-line vars-on-top
//   var nostics: typeof log
// }
