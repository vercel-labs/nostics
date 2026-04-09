import { createLogger } from '@antfu/experimental-logs-sdk'
import { devReporter } from '@antfu/experimental-logs-sdk/dev-reporter'
import { diagnostics } from './diagnostics'

export const log = createLogger({
  diagnostics: [diagnostics],
  // FIXME: I think we can put this directly within @antfu/experimental-logs-sdk, the lib author shouldn't have to import it separately
  reporter: devReporter,
})

globalThis.nostics = log

declare global {
  // eslint-disable-next-line vars-on-top
  var nostics: typeof log
}
