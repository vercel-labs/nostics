import { createConsoleReporter, defineDiagnostics, defineProdDiagnostics } from 'nostics'
import { createDevReporter } from 'nostics/reporters/dev'

/// <reference types="vite/client" />

function docsBase(code: string): string {
  return `https://example.com/docs/diagnostics/${code.toLowerCase()}`
}

// The `nosticsStrip` plugin adds the `/*#__PURE__*/` annotations and NODE_ENV
// guards at build time, so the source stays plain. A consumer bundler then
// drops the dev branch (and all `why`/`fix` text) in a production build.
export const diagnostics
  = process.env.NODE_ENV === 'production'
    ? defineProdDiagnostics({ docsBase })
    : defineDiagnostics({
        docsBase,
        reporters: [createConsoleReporter(), createDevReporter()],
        codes: {
          MATH_E001: {
            why: 'Division by zero',
            fix: 'Ensure the denominator is not zero',
          },
          MATH_E002: {
            why: ({ numbers }: { numbers: number[] }) =>
              `Invalid number inputs: ${numbers.join(', ')}`,
            fix: ({ name }: { name: string }) =>
              `Ensure all inputs are valid numbers with typed numbers if TypeScript is used, otherwise validate inputs before calling the function "${name}"`,
          },
          MATH_W001: {
            why: (p: { n: number }) => `Negative input ${p.n} for factorial`,
            fix: 'Ensure n is a non-negative integer',
          },
          MATH_W002: {
            why: (p: { n: number }) => `Large input ${p.n} may overflow`,
            fix: 'Avoid calling factorial with n > 170',
          },
          MATH_D001: {
            why: 'sum() is deprecated',
            fix: 'Use add() instead',
          },
        },
      })
