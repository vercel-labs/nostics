import type { Reporter } from './reporter'

export const devReporter: Reporter = (diagnostic) => {
  if (import.meta.hot && typeof import.meta.hot.send === 'function') {
    import.meta.hot.send('nostics:report', diagnostic)
  }
  else {
    console.warn('[nostics]: import.meta.hot.send() is not available. This must be running on Vite.')
  }
}
