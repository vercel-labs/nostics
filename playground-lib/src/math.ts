import { log } from './logger'

export function add(a: number, b: number): number {
  return a + b
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    log.MATH_E001().error()
  }
  return a / b
}

export function factorial(n: number): number {
  if (n < 0) {
    log.MATH_W001({ n }).warn()
  }
  if (n > 170) {
    log.MATH_W002({ n }).warn()
  }
  if (n > 170) {
    log.MATH_W002({ n }).warn()
  }
  if (n <= 1)
    return 1
  return n * factorial(n - 1)
}

/** @deprecated Use add() instead */
export function sum(a: number, b: number): number {
  log.MATH_D001().warn()
  return add(a, b)
}
