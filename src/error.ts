import type { Diagnostic } from './diagnostics'

export class CodedError extends Error {
  readonly diagnostic: Diagnostic

  constructor(diagnostic: Diagnostic) {
    super(`[${diagnostic.code}] ${diagnostic.message}`)
    this.name = 'CodedError'
    this.diagnostic = diagnostic
    if (diagnostic.cause != null)
      this.cause = diagnostic.cause
  }
}
