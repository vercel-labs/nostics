import type { TrackedExportsMap, TransformOptions } from './transform'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { transform } from './transform'

const CALLSITE_ID = join(import.meta.dirname, '../../../demo-lib/src/math.ts')

function expectDefinitionTransform(input: string, expected: string, options?: TransformOptions) {
  const result = transform(input, 'test.ts', options)
  expect(result).toBeDefined()
  expect(result!.code).toBe(expected)
}

function expectCallSiteTransform(input: string, expected: string) {
  const result = transform(input, CALLSITE_ID, undefined, new Map())
  expect(result).toBeDefined()
  expect(result!.code).toBe(expected)
}

function expectCallSiteUnchanged(input: string) {
  expect(transform(input, CALLSITE_ID, undefined, new Map())).toBeUndefined()
}

describe('transform', () => {
  describe('import detection', () => {
    it('returns undefined for files without nostics', () => {
      expect(transform('const x = 1', 'test.ts')).toBeUndefined()
    })

    it('returns undefined for files mentioning nostics in a string but not importing', () => {
      expect(transform('const x = "nostics"', 'test.ts')).toBeUndefined()
    })

    it('does not track unrelated nostics imports', () => {
      const input = `import { formatDiagnostic } from 'nostics'
const formatted = formatDiagnostic(diagnostic)
formatted.trim()`

      expect(transform(input, 'test.ts')).toBeUndefined()
    })
  })

  describe('pure annotations', () => {
    it('adds /*#__PURE__*/ to defineDiagnostics calls', () => {
      const input = `import { defineDiagnostics } from 'nostics'
const diagnostics = defineDiagnostics({ codes: {} })`

      const expected = `import { defineDiagnostics } from 'nostics'
const diagnostics = /*#__PURE__*/ defineDiagnostics({ codes: {} })`

      expectDefinitionTransform(input, expected)
    })

    it('adds /*#__PURE__*/ to exported defineDiagnostics calls', () => {
      const input = `import { defineDiagnostics } from 'nostics'
export const diagnostics = defineDiagnostics({ codes: {} })`

      const expected = `import { defineDiagnostics } from 'nostics'
export const diagnostics = /*#__PURE__*/ defineDiagnostics({ codes: {} })`

      expectDefinitionTransform(input, expected)
    })

    it('handles renamed defineDiagnostics imports', () => {
      const input = `import { defineDiagnostics as define } from 'nostics'
export const diagnostics = define({ codes: {} })`

      const expected = `import { defineDiagnostics as define } from 'nostics'
export const diagnostics = /*#__PURE__*/ define({ codes: {} })`

      expectDefinitionTransform(input, expected)
    })

    it('supports custom package name', () => {
      const input = `import { defineDiagnostics } from 'my-custom-sdk'
export const diagnostics = defineDiagnostics({ codes: {} })`

      const expected = `import { defineDiagnostics } from 'my-custom-sdk'
export const diagnostics = /*#__PURE__*/ defineDiagnostics({ codes: {} })`

      expectDefinitionTransform(input, expected, { packageName: 'my-custom-sdk' })
    })

    it('adds /*#__PURE__*/ to createConsoleReporter calls nested in the options', () => {
      const input = `import { createConsoleReporter, defineDiagnostics } from 'nostics'
export const diagnostics = defineDiagnostics({ reporters: [createConsoleReporter()], codes: {} })`

      const expected = `import { createConsoleReporter, defineDiagnostics } from 'nostics'
export const diagnostics = /*#__PURE__*/ defineDiagnostics({ reporters: [/*#__PURE__*/ createConsoleReporter()], codes: {} })`

      expectDefinitionTransform(input, expected)
    })

    it('handles renamed createConsoleReporter imports', () => {
      const input = `import { createConsoleReporter as log, defineDiagnostics } from 'nostics'
export const diagnostics = defineDiagnostics({ reporters: [log({ method: 'error' })], codes: {} })`

      const expected = `import { createConsoleReporter as log, defineDiagnostics } from 'nostics'
export const diagnostics = /*#__PURE__*/ defineDiagnostics({ reporters: [/*#__PURE__*/ log({ method: 'error' })], codes: {} })`

      expectDefinitionTransform(input, expected)
    })

    it('marks pure factories imported from a subpath (e.g. createDevReporter)', () => {
      const input = `import { defineDiagnostics } from 'nostics'
import { createDevReporter } from 'nostics/reporters/dev'
export const diagnostics = defineDiagnostics({ reporters: [createDevReporter()], codes: {} })`

      const expected = `import { defineDiagnostics } from 'nostics'
import { createDevReporter } from 'nostics/reporters/dev'
export const diagnostics = /*#__PURE__*/ defineDiagnostics({ reporters: [/*#__PURE__*/ createDevReporter()], codes: {} })`

      expectDefinitionTransform(input, expected)
    })

    it('adds /*#__PURE__*/ to defineProdDiagnostics calls (manual prod opt-in)', () => {
      const input = `import { defineProdDiagnostics } from 'nostics'
export const diagnostics = defineProdDiagnostics({ docsBase: 'https://x.com' })`

      const expected = `import { defineProdDiagnostics } from 'nostics'
export const diagnostics = /*#__PURE__*/ defineProdDiagnostics({ docsBase: 'https://x.com' })`

      expectDefinitionTransform(input, expected)
    })

    it('annotates both branches of a NODE_ENV ternary selecting prod/dev diagnostics', () => {
      const input = `import { defineDiagnostics, defineProdDiagnostics } from 'nostics'
export const diagnostics = process.env.NODE_ENV === 'production' ? defineProdDiagnostics({ docsBase }) : defineDiagnostics({ docsBase, codes: {} })
diagnostics.E1()`

      const expected = `import { defineDiagnostics, defineProdDiagnostics } from 'nostics'
export const diagnostics = process.env.NODE_ENV === 'production' ? /*#__PURE__*/ defineProdDiagnostics({ docsBase }) : /*#__PURE__*/ defineDiagnostics({ docsBase, codes: {} })
process.env.NODE_ENV !== "production" && diagnostics.E1()`

      expectDefinitionTransform(input, expected)
    })
  })

  describe('cross-file tracking', () => {
    it('wraps diagnostics imported from a relative module', () => {
      const input = `import { diagnostics } from './diagnostics'
export function run() {
  diagnostics.E1()
}`

      const expected = `import { diagnostics } from './diagnostics'
export function run() {
  process.env.NODE_ENV !== "production" && diagnostics.E1()
}`

      expectCallSiteTransform(input, expected)
    })

    it('uses the shared tracked exports cache when present', () => {
      const trackedExportsMap: TrackedExportsMap = new Map()
      const diagnosticsId = join(import.meta.dirname, '../../demo-lib/src/diagnostics.ts')

      transform(
        `import { defineDiagnostics } from 'nostics'
export const diagnostics = defineDiagnostics({ codes: {} })`,
        diagnosticsId,
        undefined,
        trackedExportsMap,
      )

      const input = `import { diagnostics } from './diagnostics'
diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
process.env.NODE_ENV !== "production" && diagnostics.E1()`

      const result = transform(input, CALLSITE_ID, undefined, trackedExportsMap)
      expect(result).toBeDefined()
      expect(result!.code).toBe(expected)
    })

    it('tracks a NODE_ENV ternary (prod/dev) export across a relative import', () => {
      const trackedExportsMap: TrackedExportsMap = new Map()
      const diagnosticsId = join(import.meta.dirname, '../../demo-lib/src/diagnostics.ts')

      transform(
        `import { defineDiagnostics, defineProdDiagnostics } from 'nostics'
export const diagnostics = process.env.NODE_ENV === 'production' ? defineProdDiagnostics({}) : defineDiagnostics({ codes: {} })`,
        diagnosticsId,
        undefined,
        trackedExportsMap,
      )

      const input = `import { diagnostics } from './diagnostics'
diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
process.env.NODE_ENV !== "production" && diagnostics.E1()`

      const result = transform(input, CALLSITE_ID, undefined, trackedExportsMap)
      expect(result).toBeDefined()
      expect(result!.code).toBe(expected)
    })

    it('tracks renamed relative imports', () => {
      const input = `import { diagnostics as diag } from './diagnostics'
diag.E1()`

      const expected = `import { diagnostics as diag } from './diagnostics'
process.env.NODE_ENV !== "production" && diag.E1()`

      expectCallSiteTransform(input, expected)
    })

    it('does not wrap imports from non-relative modules', () => {
      const input = `import { diagnostics } from 'demo-lib/diagnostics'
diagnostics.E1()`

      expect(transform(input, CALLSITE_ID, undefined, new Map())).toBeUndefined()
    })
  })

  describe('expression statement wrapping', () => {
    it('wraps diagnostic handle calls', () => {
      const input = `import { diagnostics } from './diagnostics'
diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
process.env.NODE_ENV !== "production" && diagnostics.E1()`

      expectCallSiteTransform(input, expected)
    })

    it('wraps diagnostic handle calls with arguments', () => {
      const input = `import { diagnostics } from './diagnostics'
diagnostics.B2011({ src: '/bad.ts' })`

      const expected = `import { diagnostics } from './diagnostics'
process.env.NODE_ENV !== "production" && diagnostics.B2011({ src: '/bad.ts' })`

      expectCallSiteTransform(input, expected)
    })

    it('wraps multiple expression statements', () => {
      const input = `import { diagnostics } from './diagnostics'
diagnostics.E1()
diagnostics.E2()
diagnostics.E3()`

      const expected = `import { diagnostics } from './diagnostics'
process.env.NODE_ENV !== "production" && diagnostics.E1()
process.env.NODE_ENV !== "production" && diagnostics.E2()
process.env.NODE_ENV !== "production" && diagnostics.E3()`

      expectCallSiteTransform(input, expected)
    })
  })

  describe('nested usages', () => {
    it('transforms inside function bodies', () => {
      const input = `import { diagnostics } from './diagnostics'
function handler() {
  diagnostics.E1()
}`

      const expected = `import { diagnostics } from './diagnostics'
function handler() {
  process.env.NODE_ENV !== "production" && diagnostics.E1()
}`

      expectCallSiteTransform(input, expected)
    })

    it('transforms inside if blocks', () => {
      const input = `import { diagnostics } from './diagnostics'
if (condition) {
  diagnostics.E1()
}`

      const expected = `import { diagnostics } from './diagnostics'
if (condition) {
  process.env.NODE_ENV !== "production" && diagnostics.E1()
}`

      expectCallSiteTransform(input, expected)
    })

    it('does not transform a function parameter that shadows diagnostics', () => {
      const input = `import { diagnostics } from './diagnostics'
function setup(diagnostics) {
  diagnostics.E1()
}
diagnostics.E2()`

      const expected = `import { diagnostics } from './diagnostics'
function setup(diagnostics) {
  diagnostics.E1()
}
process.env.NODE_ENV !== "production" && diagnostics.E2()`

      expectCallSiteTransform(input, expected)
    })

    it('does not transform a block binding that shadows diagnostics', () => {
      const input = `import { diagnostics } from './diagnostics'
if (condition) {
  const diagnostics = getDiagnostics()
  diagnostics.E1()
}
diagnostics.E2()`

      const expected = `import { diagnostics } from './diagnostics'
if (condition) {
  const diagnostics = getDiagnostics()
  diagnostics.E1()
}
process.env.NODE_ENV !== "production" && diagnostics.E2()`

      expectCallSiteTransform(input, expected)
    })
  })

  describe('bare conditional expression wrapping', () => {
    it('wraps bare logical AND with diagnostics on right', () => {
      const input = `import { diagnostics } from './diagnostics'
someCondition && diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
process.env.NODE_ENV !== "production" && someCondition && diagnostics.E1()`

      expectCallSiteTransform(input, expected)
    })

    it('wraps bare logical OR with diagnostics on right', () => {
      const input = `import { diagnostics } from './diagnostics'
condition || diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
process.env.NODE_ENV !== "production" && (condition || diagnostics.E1())`

      expectCallSiteTransform(input, expected)
    })

    it('wraps bare ternary that reports one of two diagnostics', () => {
      const input = `import { diagnostics } from './diagnostics'
condition ? diagnostics.E1() : diagnostics.E2()`

      const expected = `import { diagnostics } from './diagnostics'
process.env.NODE_ENV !== "production" && (condition ? diagnostics.E1() : diagnostics.E2())`

      expectCallSiteTransform(input, expected)
    })
  })

  describe('value-passing patterns', () => {
    it('does not wrap variable declaration', () => {
      const input = `import { diagnostics } from './diagnostics'
const x = diagnostics.E1()`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap return statement', () => {
      const input = `import { diagnostics } from './diagnostics'
function handler() {
  return diagnostics.E1()
}`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap ternary returned from a function', () => {
      const input = `import { diagnostics } from './diagnostics'
function handler(condition) {
  return condition ? diagnostics.E1() : null
}`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap diagnostics passed as function argument', () => {
      const input = `import { diagnostics } from './diagnostics'
fn(diagnostics.E1())`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap ternary passed as function argument', () => {
      const input = `import { diagnostics } from './diagnostics'
fn(condition ? diagnostics.E1() : null)`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap diagnostics passed as method argument', () => {
      const input = `import { diagnostics } from './diagnostics'
arr.push(diagnostics.E1())`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap assignment expression', () => {
      const input = `import { diagnostics } from './diagnostics'
let x
x = diagnostics.E1()`

      expectCallSiteUnchanged(input)
    })
  })

  describe('throw statements', () => {
    it('does not wrap a top-level throw statement', () => {
      const input = `import { diagnostics } from './diagnostics'
throw diagnostics.E1()`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap a throw with arguments', () => {
      const input = `import { diagnostics } from './diagnostics'
throw diagnostics.E1({ src: '/bad.ts' })`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap a throw inside a function body', () => {
      const input = `import { diagnostics } from './diagnostics'
function validate(x) {
  if (!x) {
    throw diagnostics.E1()
  }
}`

      expectCallSiteUnchanged(input)
    })

    it('does not wrap a throw inside an if block', () => {
      const input = `import { diagnostics } from './diagnostics'
if (bad) {
  throw diagnostics.E1()
}`

      expectCallSiteUnchanged(input)
    })
  })

  describe('statement contexts', () => {
    it('wraps inside a brace-less if', () => {
      const input = `import { diagnostics } from './diagnostics'
if (cond) diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
if (cond) process.env.NODE_ENV !== "production" && diagnostics.E1()`

      expectCallSiteTransform(input, expected)
    })

    it('wraps inside a brace-less else', () => {
      const input = `import { diagnostics } from './diagnostics'
if (cond) {} else diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
if (cond) {} else process.env.NODE_ENV !== "production" && diagnostics.E1()`

      expectCallSiteTransform(input, expected)
    })

    it('wraps inside a for...of loop', () => {
      const input = `import { diagnostics } from './diagnostics'
for (const x of arr) {
  diagnostics.E1()
}`

      const expected = `import { diagnostics } from './diagnostics'
for (const x of arr) {
  process.env.NODE_ENV !== "production" && diagnostics.E1()
}`

      expectCallSiteTransform(input, expected)
    })

    it('wraps inside a for...in loop', () => {
      const input = `import { diagnostics } from './diagnostics'
for (const k in obj) {
  diagnostics.E1()
}`

      const expected = `import { diagnostics } from './diagnostics'
for (const k in obj) {
  process.env.NODE_ENV !== "production" && diagnostics.E1()
}`

      expectCallSiteTransform(input, expected)
    })

    it('wraps inside try/catch/finally blocks', () => {
      const input = `import { diagnostics } from './diagnostics'
try {
  diagnostics.E1()
} catch (e) {
  diagnostics.E2()
} finally {
  diagnostics.E3()
}`

      const expected = `import { diagnostics } from './diagnostics'
try {
  process.env.NODE_ENV !== "production" && diagnostics.E1()
} catch (e) {
  process.env.NODE_ENV !== "production" && diagnostics.E2()
} finally {
  process.env.NODE_ENV !== "production" && diagnostics.E3()
}`

      expectCallSiteTransform(input, expected)
    })

    it('wraps inside a switch case', () => {
      const input = `import { diagnostics } from './diagnostics'
switch (x) {
  case 1:
    diagnostics.E1()
    break
}`

      const expected = `import { diagnostics } from './diagnostics'
switch (x) {
  case 1:
    process.env.NODE_ENV !== "production" && diagnostics.E1()
    break
}`

      expectCallSiteTransform(input, expected)
    })

    it('wraps inside an arrow function block body', () => {
      const input = `import { diagnostics } from './diagnostics'
const f = () => {
  diagnostics.E1()
}`

      const expected = `import { diagnostics } from './diagnostics'
const f = () => {
  process.env.NODE_ENV !== "production" && diagnostics.E1()
}`

      expectCallSiteTransform(input, expected)
    })

    it('wraps inside a function expression assigned to a variable', () => {
      const input = `import { diagnostics } from './diagnostics'
const f = function () {
  diagnostics.E1()
}`

      const expected = `import { diagnostics } from './diagnostics'
const f = function () {
  process.env.NODE_ENV !== "production" && diagnostics.E1()
}`

      expectCallSiteTransform(input, expected)
    })

    it('wraps inside a class method', () => {
      const input = `import { diagnostics } from './diagnostics'
class A {
  m() {
    diagnostics.E1()
  }
}`

      const expected = `import { diagnostics } from './diagnostics'
class A {
  m() {
    process.env.NODE_ENV !== "production" && diagnostics.E1()
  }
}`

      expectCallSiteTransform(input, expected)
    })

    it('does not wrap an arrow with an expression body', () => {
      const input = `import { diagnostics } from './diagnostics'
const f = () => diagnostics.E1()`

      expectCallSiteUnchanged(input)
    })
  })

  describe('does not transform non-diagnostic code', () => {
    it('does not wrap unrelated expression statements', () => {
      const input = `import { diagnostics } from './diagnostics'
console.log('hello')
diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
console.log('hello')
process.env.NODE_ENV !== "production" && diagnostics.E1()`

      expectCallSiteTransform(input, expected)
    })

    it('does not add PURE to non-imported function calls in call-site files', () => {
      const input = `import { diagnostics } from './diagnostics'
const other = someOtherFunction()
diagnostics.E1()`

      const expected = `import { diagnostics } from './diagnostics'
const other = someOtherFunction()
process.env.NODE_ENV !== "production" && diagnostics.E1()`

      expectCallSiteTransform(input, expected)
    })
  })

  describe('source maps', () => {
    it('produces a source map for definition files', () => {
      const input = `import { defineDiagnostics } from 'nostics'
export const diagnostics = defineDiagnostics({ codes: {} })`

      const result = transform(input, 'test.ts')
      expect(result).toBeDefined()
      expect(result!.map).toBeDefined()
      expect(result!.map.mappings).toBeTruthy()
    })

    it('produces a source map for call-site files', () => {
      const input = `import { diagnostics } from './diagnostics'
diagnostics.E1()`

      const result = transform(input, CALLSITE_ID, undefined, new Map())
      expect(result).toBeDefined()
      expect(result!.map).toBeDefined()
      expect(result!.map.mappings).toBeTruthy()
    })
  })
})
