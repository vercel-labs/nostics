import { diagnostics } from './diagnostics'

export function add(a: number, b: number): number {
  return a + b
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    diagnostics.MATH_E001.report()
  }
  return a / b
}

export function factorial(n: number): number {
  if (n < 0) {
    diagnostics.MATH_W001.report({ n })
  }
  if (n > 170) {
    diagnostics.MATH_W002.report({ n })
  }
  if (n <= 1)
    return 1
  return n * factorial(n - 1)
}

export function sum(a: number, b: number): number {
  diagnostics.MATH_D001.report()
  return add(a, b)
}
