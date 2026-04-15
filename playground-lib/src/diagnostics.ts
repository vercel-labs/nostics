import { defineDiagnostics } from 'logs-sdk'

export const diagnostics = defineDiagnostics({
  codes: {
    MATH_E001: {
      message: 'Division by zero',
      fix: 'Pass a non-zero divisor',
      level: 'error',
    },
    MATH_W001: {
      message: (p: { n: number }) => `Negative input ${p.n} for factorial`,
      fix: 'Pass a non-negative integer',
      level: 'warn',
    },
    MATH_W002: {
      message: (p: { n: number }) => `Large input ${p.n} may overflow`,
      hint: 'Keep n <= 170 to avoid Infinity',
      level: 'warn',
    },
    MATH_D001: {
      message: 'sum() is deprecated',
      fix: 'Use add() instead',
      level: 'deprecation',
    },
  },
})
