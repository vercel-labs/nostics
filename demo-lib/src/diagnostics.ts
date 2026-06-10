import { createReporterLog, defineDiagnostics } from 'nostics'
import { devReporter } from 'nostics/reporters/dev'

export const diagnostics = defineDiagnostics({
  docsBase: code => `https://example.com/docs/diagnostics/${code.toLowerCase()}`,
  reporters: [createReporterLog(), devReporter],
  codes: {
    MATH_E001: {
      why: 'Division by zero',
      fix: 'Ensure the denominator is not zero',
    },
    MATH_E002: {
      why: ({ numbers }: { numbers: number[] }) => `Invalid number inputs: ${numbers.join(', ')}`,
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
