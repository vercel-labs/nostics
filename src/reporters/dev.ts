import type { DiagnosticReporter } from '../diagnostic'

export const devReporter: DiagnosticReporter = (diagnostic) => {
  if (import.meta.hot && typeof import.meta.hot.send === 'function') {
    import.meta.hot.send('logs-sdk:report', diagnostic.toJSON())
  }
  else {
    console.warn(
      '[logs-sdk]: import.meta.hot.send() is not available. This must be running on Vite.',
    )
  }
}
