import { describe, expect, it } from 'vitest'
import { createCodeRegistry, extractDiagnosticCodes } from './detect-duplicate-codes'

describe('extractDiagnosticCodes', () => {
  it('extracts codes from a single defineDiagnostics call', () => {
    const input = `import { defineDiagnostics } from 'nostics'
const diagnostics = defineDiagnostics({ docsBase, codes: { A: {}, B: {} } })`

    expect(extractDiagnosticCodes(input, 'test.ts')).toEqual(['A', 'B'])
  })

  it('extracts string-literal keys', () => {
    const input = `import { defineDiagnostics } from 'nostics'
const diagnostics = defineDiagnostics({ codes: { 'MATH_E001': {}, "MATH_E002": {} } })`

    expect(extractDiagnosticCodes(input, 'test.ts')).toEqual(['MATH_E001', 'MATH_E002'])
  })

  it('extracts dev-branch codes from the production ternary', () => {
    const input = `import { defineDiagnostics, defineProdDiagnostics } from 'nostics'
export const diagnostics
  = process.env.NODE_ENV === 'production'
    ? defineProdDiagnostics({ docsBase })
    : defineDiagnostics({ docsBase, codes: { A: {}, B: {} } })`

    expect(extractDiagnosticCodes(input, 'test.ts')).toEqual(['A', 'B'])
  })

  it('respects a local alias for defineDiagnostics', () => {
    const input = `import { defineDiagnostics as dd } from 'nostics'
const diagnostics = dd({ codes: { A: {} } })`

    expect(extractDiagnosticCodes(input, 'test.ts')).toEqual(['A'])
  })

  it('resolves the package name option', () => {
    const input = `import { defineDiagnostics } from '@scope/lib'
const diagnostics = defineDiagnostics({ codes: { A: {} } })`

    expect(extractDiagnosticCodes(input, 'test.ts', { packageName: '@scope/lib' })).toEqual(['A'])
  })

  it('ignores computed keys and spreads', () => {
    const input = `import { defineDiagnostics } from 'nostics'
const FOO = 'X'
const diagnostics = defineDiagnostics({ codes: { A: {}, [FOO]: {}, ...base } })`

    expect(extractDiagnosticCodes(input, 'test.ts')).toEqual(['A'])
  })

  it('returns [] for files without defineDiagnostics', () => {
    expect(extractDiagnosticCodes('const x = 1', 'test.ts')).toEqual([])
  })

  it('returns [] when defineDiagnostics is not imported from the package', () => {
    const input = `import { defineDiagnostics } from 'somewhere-else'
const diagnostics = defineDiagnostics({ codes: { A: {} } })`

    expect(extractDiagnosticCodes(input, 'test.ts')).toEqual([])
  })

  it('returns [] when the call has no codes object', () => {
    const input = `import { defineDiagnostics } from 'nostics'
const diagnostics = defineDiagnostics({ docsBase })`

    expect(extractDiagnosticCodes(input, 'test.ts')).toEqual([])
  })
})

describe('createCodeRegistry', () => {
  it('reports no duplicates for distinct codes', () => {
    const registry = createCodeRegistry()
    registry.update('a.ts', ['A'])
    registry.update('b.ts', ['B'])
    expect(registry.findDuplicatesFor('a.ts')).toEqual([])
    expect(registry.findDuplicatesFor('b.ts')).toEqual([])
  })

  it('reports a duplicate code naming every owning file', () => {
    const registry = createCodeRegistry()
    registry.update('a.ts', ['DUP'])
    registry.update('b.ts', ['DUP'])

    expect(registry.findDuplicatesFor('b.ts')).toEqual([{ code: 'DUP', files: ['a.ts', 'b.ts'] }])
  })

  it('does not flag a code defined twice within the same file', () => {
    const registry = createCodeRegistry()
    registry.update('a.ts', ['DUP', 'DUP'])
    expect(registry.findDuplicatesFor('a.ts')).toEqual([])
  })

  it('clears stale codes when a file is updated (HMR rename)', () => {
    const registry = createCodeRegistry()
    registry.update('a.ts', ['OLD'])
    registry.update('b.ts', ['OLD'])
    expect(registry.findDuplicatesFor('b.ts')).toHaveLength(1)

    // a.ts renames its code: the collision must disappear
    registry.update('a.ts', ['NEW'])
    expect(registry.findDuplicatesFor('b.ts')).toEqual([])
  })

  it('clears a file entirely on remove', () => {
    const registry = createCodeRegistry()
    registry.update('a.ts', ['DUP'])
    registry.update('b.ts', ['DUP'])
    expect(registry.findDuplicatesFor('b.ts')).toHaveLength(1)

    registry.remove('a.ts')
    expect(registry.findDuplicatesFor('b.ts')).toEqual([])
  })
})
