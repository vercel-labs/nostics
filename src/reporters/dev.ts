import type { DiagnosticReporter } from '../diagnostic'

export const devReporter: DiagnosticReporter = (diagnostic) => {
  if (import.meta.hot && typeof import.meta.hot.send === 'function') {
    import.meta.hot.send('nostics:report', diagnostic.toJSON())
  }
  else {
    console.warn(
      '[nostics]: import.meta.hot.send() is not available. This must be running on Vite.',
    )
  }
}
