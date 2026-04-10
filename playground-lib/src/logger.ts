import { consoleReporter, createLogger } from 'nostics'
// TODO: figure out a way to automatically add this reporter in the correct context
import { devReporter } from 'nostics/dev-reporter'
import { diagnostics } from './diagnostics'

export const log = createLogger({
  diagnostics: [diagnostics],
  reporter: [consoleReporter, devReporter],
})

// TODO: explore this idea

// globalThis.nostics = log
// declare global {
//   // eslint-disable-next-line vars-on-top
//   var nostics: typeof log
// }
