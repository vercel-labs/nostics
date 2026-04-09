import type { Logger } from 'logs-sdk'
import { createLogger } from 'logs-sdk'
import { devReporter } from 'logs-sdk/dev-reporter'
import { diagnostics } from './diagnostics'

export const log: Logger<[typeof diagnostics]>
  = createLogger({
    diagnostics: [diagnostics],
    // FIXME: I think we can put this directly within logs-sdk, the lib author shouldn't have to import it separately
    reporter: devReporter,
  })

globalThis.nostics = log

declare global {
  // eslint-disable-next-line vars-on-top
  var nostics: typeof log
}
