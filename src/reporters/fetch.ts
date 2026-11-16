import type { DiagnosticReporter } from '../diagnostic'

/**
 * Creates a reporter that POSTs each diagnostic as JSON to the given URL.
 * Errors are swallowed so reporting never throws into user code.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createFetchReporter(url: string): DiagnosticReporter {
  return (diagnostic) => {
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagnostic),
      }).catch(() => {})
    } catch {
      // `JSON.stringify()` throws on circular or BigInt data; reporting must
      // never throw into user code
    }
  }
}
