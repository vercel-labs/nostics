import type { Diagnostic } from './types'

export class CodedError extends Error {
  readonly diagnostic: Diagnostic
  readonly code: string
  readonly docsUrl?: string
  readonly fix?: string
  readonly why?: string
  readonly hint?: string

  constructor(diagnostic: Diagnostic) {
    const tag = diagnostic.prefix
      ? `[${diagnostic.prefix}_${diagnostic.code}]`
      : `[${diagnostic.code}]`
    super(`${tag} ${diagnostic.message}`)
    this.name = 'CodedError'
    this.diagnostic = diagnostic
    this.code = diagnostic.code
    this.docsUrl = diagnostic.docs
    this.fix = diagnostic.fix
    this.why = diagnostic.why
    this.hint = diagnostic.hint
    if (diagnostic.cause != null)
      this.cause = diagnostic.cause
  }
}
