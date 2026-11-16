import type { Diagnostic, DiagnosticDefinition, InferDiagnosticCodes } from './diagnostic'
import { describe, expectTypeOf, it } from 'vitest'
import { defineDiagnostics } from './diagnostic'
import { mergeDiagnostics } from './merge-diagnostics'
import { defineProdDiagnostics } from './prod-diagnostics'

describe('mergeDiagnostics', () => {
  const codesA = {
    A: { why: 'a', data: (p: { n: number }) => ({ n: p.n }) },
  } satisfies Record<string, DiagnosticDefinition>
  const a = defineDiagnostics({ codes: codesA })
  const b = defineDiagnostics({ codes: { B: { why: 'b' } } })
  const error: unknown = null

  it('has the handles of every registry', () => {
    const merged = mergeDiagnostics(a, b)
    expectTypeOf(merged.A).toEqualTypeOf(a.A)
    expectTypeOf(merged.B).toEqualTypeOf(b.B)
    expectTypeOf(merged.A({ n: 1 })).toEqualTypeOf<Diagnostic<{ n: number }, 'A'>>()
    expectTypeOf(merged).not.toHaveProperty('C')
  })

  it('narrows is to the union of the diagnostics', () => {
    const merged = mergeDiagnostics(a, b)
    if (merged.is(error)) {
      expectTypeOf(error).toEqualTypeOf<
        Diagnostic<{ n: number }, 'A'> | Diagnostic<undefined, 'B'>
      >()
    }
  })

  it('works with InferDiagnosticCodes', () => {
    const merged = mergeDiagnostics(a, b)
    expectTypeOf<InferDiagnosticCodes<typeof merged>>().toEqualTypeOf<'A' | 'B'>()
  })

  it('rejects prod registries', () => {
    // @ts-expect-error: dev only
    mergeDiagnostics(a, defineProdDiagnostics())
    // @ts-expect-error: dev only
    mergeDiagnostics(a, defineProdDiagnostics<typeof codesA>())
    const either =
      process.env.NODE_ENV === 'production'
        ? defineProdDiagnostics<typeof codesA>()
        : defineDiagnostics({ codes: codesA })
    // @ts-expect-error: dev only
    mergeDiagnostics(either, b)
  })

  it('goes in the dev branch of a dev/prod ternary', () => {
    const either =
      process.env.NODE_ENV === 'production' ? defineProdDiagnostics() : mergeDiagnostics(a, b)
    expectTypeOf<InferDiagnosticCodes<typeof either>>().toEqualTypeOf<'A' | 'B'>()
    expectTypeOf(either.A({ n: 1 }).data).toEqualTypeOf<{ n: number } | undefined>()
    if (either.A.is(error)) {
      expectTypeOf(error.data).toEqualTypeOf<{ n: number } | undefined>()
    }
  })
})
