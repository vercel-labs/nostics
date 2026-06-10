import type { DiagnosticReporter } from '../diagnostic'

/**
 * Creates a reporter for browser code under Vite dev: it forwards each
 * diagnostic over `import.meta.hot.send('nostics:report', ...)` so the
 * dev-server collector can file it. Outside Vite (`import.meta.hot` absent) it
 * warns once and does nothing.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createDevReporter(): DiagnosticReporter {
  return (diagnostic) => {
    if (import.meta.hot && typeof import.meta.hot.send === 'function') {
      import.meta.hot.send('nostics:report', diagnostic.toJSON())
    }
    else {
      console.warn(
        '[nostics]: import.meta.hot.send() is not available. This must be running on Vite.',
      )
    }
  }
}

/**
 * Ready-made dev reporter, equivalent to `createDevReporter()`.
 *
 * @deprecated Use `createDevReporter()` instead.
 */
export const devReporter: DiagnosticReporter = createDevReporter()
