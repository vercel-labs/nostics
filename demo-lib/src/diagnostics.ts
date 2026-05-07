import { defineDiagnostics } from 'logs-sdk'

export const diagnostics = defineDiagnostics({
  docsBase: code => `https://example.com/docs/diagnostics/${code.toLowerCase()}`,
  codes: {
    MATH_E001: {
      message: 'Division by zero',
      fix: 'Ensure the denominator is not zero',
      level: 'error',
    },
    MATH_W001: {
      message: (p: { n: number }) => `Negative input ${p.n} for factorial`,
      fix: 'Ensure n is a non-negative integer',
      level: 'warn',
    },
    MATH_W002: {
      message: (p: { n: number }) => `Large input ${p.n} may overflow`,
      hint: 'Avoid calling factorial with n > 170',
      level: 'warn',
    },
    MATH_D001: {
      message: 'sum() is deprecated',
      fix: 'Use add() instead',
      level: 'deprecation',
    },
  },
})
