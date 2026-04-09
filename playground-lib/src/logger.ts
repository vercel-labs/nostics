import { consoleReporter, createLogger } from 'logs-sdk'
import { diagnostics } from './diagnostics'

export const log = createLogger({
  diagnostics: [diagnostics],
  reporter: consoleReporter,
})
