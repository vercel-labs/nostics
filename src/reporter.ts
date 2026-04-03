import type { Reporter } from './types'

export const consoleReporter: Reporter = {
  report(diagnostic, formatted) {
    if (diagnostic.level === 'error')
      console.error(formatted)
    else
      console.warn(formatted)
  },
}

export function createFetchReporter(url: string): Reporter {
  return {
    report(diagnostic, _formatted) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagnostic),
      }).catch(() => {})
    },
  }
}
