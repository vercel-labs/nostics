import type { DiagnosticReporter } from '../diagnostic'

/**
 * Creates a reporter that POSTs each diagnostic as JSON to the given URL.
 * Errors are swallowed so reporting never throws into user code.
 */
export function createFetchReporter(url: string): DiagnosticReporter {
  return (diagnostic) => {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diagnostic),
    }).catch(() => {})
  }
}
