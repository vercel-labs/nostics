import { describe, expect, it } from 'vitest'
import { transform } from '../../src/code-transform/transform'

function expectTransform(input: string, expected: string) {
  const result = transform(input, 'test.ts')
  expect(result).toBeDefined()
  expect(result!.code).toBe(expected)
}

describe('transform', () => {
  describe('import detection', () => {
    it('returns undefined for files without logs-sdk', () => {
      expect(transform('const x = 1', 'test.ts')).toBeUndefined()
    })

    it('returns undefined for files mentioning logs-sdk in a string but not importing', () => {
      expect(transform('const x = "logs-sdk"', 'test.ts')).toBeUndefined()
    })

    it('detects named imports from logs-sdk', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
log.E1().warn()`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
process.env.NODE_ENV !== 'production' && log.E1().warn()`

      expectTransform(input, expected)
    })

    it('handles renamed imports', () => {
      const input = `import { createLogger as myLog } from 'logs-sdk'
const log = myLog({})
log.E1().warn()`

      const expected = `import { createLogger as myLog } from 'logs-sdk'
const log = /*#__PURE__*/ myLog({})
process.env.NODE_ENV !== 'production' && log.E1().warn()`

      expectTransform(input, expected)
    })
  })

  describe('pURE annotations', () => {
    it('adds /*#__PURE__*/ to defineDiagnostics calls', () => {
      const input = `import { defineDiagnostics } from 'logs-sdk'
const diags = defineDiagnostics({ codes: {} })`

      const expected = `import { defineDiagnostics } from 'logs-sdk'
const diags = /*#__PURE__*/ defineDiagnostics({ codes: {} })`

      expectTransform(input, expected)
    })

    it('adds /*#__PURE__*/ to createLogger calls', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({ diagnostics: [] })`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({ diagnostics: [] })`

      expectTransform(input, expected)
    })

    it('adds /*#__PURE__*/ to both defineDiagnostics and createLogger', () => {
      const input = `import { defineDiagnostics, createLogger } from 'logs-sdk'
const diags = defineDiagnostics({ codes: { E1: { message: 'x' } } })
const log = createLogger({ diagnostics: [diags] })`

      const expected = `import { defineDiagnostics, createLogger } from 'logs-sdk'
const diags = /*#__PURE__*/ defineDiagnostics({ codes: { E1: { message: 'x' } } })
const log = /*#__PURE__*/ createLogger({ diagnostics: [diags] })`

      expectTransform(input, expected)
    })
  })

  describe('expression statement wrapping', () => {
    it('wraps log.CODE().method() calls', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
log.E1().warn()`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
process.env.NODE_ENV !== 'production' && log.E1().warn()`

      expectTransform(input, expected)
    })

    it('wraps chained calls with arguments', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
log.B2011({ src: '/bad.ts' }).warn()`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
process.env.NODE_ENV !== 'production' && log.B2011({ src: '/bad.ts' }).warn()`

      expectTransform(input, expected)
    })

    it('wraps raw logger methods', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
log.warn(someDiagnostic)`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
process.env.NODE_ENV !== 'production' && log.warn(someDiagnostic)`

      expectTransform(input, expected)
    })

    it('wraps multiple expression statements', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
log.E1().warn()
log.E2().error()
log.E3().log()`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
process.env.NODE_ENV !== 'production' && log.E1().warn()
process.env.NODE_ENV !== 'production' && log.E2().error()
process.env.NODE_ENV !== 'production' && log.E3().log()`

      expectTransform(input, expected)
    })
  })

  describe('nested scopes', () => {
    it('transforms inside function bodies', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
function handler() {
  log.E1().warn()
}`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
function handler() {
  process.env.NODE_ENV !== 'production' && log.E1().warn()
}`

      expectTransform(input, expected)
    })

    it('transforms inside if blocks', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
if (condition) {
  log.E1().warn()
}`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
if (condition) {
  process.env.NODE_ENV !== 'production' && log.E1().warn()
}`

      expectTransform(input, expected)
    })

    it('transforms function-scoped logger creation', () => {
      const input = `import { defineDiagnostics, createLogger } from 'logs-sdk'
function setup() {
  const diags = defineDiagnostics({ codes: {} })
  const log = createLogger({ diagnostics: [diags] })
  log.E1().warn()
}`

      const expected = `import { defineDiagnostics, createLogger } from 'logs-sdk'
function setup() {
  const diags = /*#__PURE__*/ defineDiagnostics({ codes: {} })
  const log = /*#__PURE__*/ createLogger({ diagnostics: [diags] })
  process.env.NODE_ENV !== 'production' && log.E1().warn()
}`

      expectTransform(input, expected)
    })
  })

  describe('does not transform non-logging code', () => {
    it('does not wrap unrelated expression statements', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
console.log('hello')
log.E1().warn()`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
console.log('hello')
process.env.NODE_ENV !== 'production' && log.E1().warn()`

      expectTransform(input, expected)
    })

    it('does not add PURE to non-imported function calls', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})
const other = someOtherFunction()
log.E1().warn()`

      const expected = `import { createLogger } from 'logs-sdk'
const log = /*#__PURE__*/ createLogger({})
const other = someOtherFunction()
process.env.NODE_ENV !== 'production' && log.E1().warn()`

      expectTransform(input, expected)
    })
  })

  describe('custom package name', () => {
    it('supports custom package name', () => {
      const input = `import { createLogger } from 'my-custom-sdk'
const log = createLogger({})
log.E1().warn()`

      const expected = `import { createLogger } from 'my-custom-sdk'
const log = /*#__PURE__*/ createLogger({})
process.env.NODE_ENV !== 'production' && log.E1().warn()`

      const result = transform(input, 'test.ts', { packageName: 'my-custom-sdk' })
      expect(result).toBeDefined()
      expect(result!.code).toBe(expected)
    })
  })

  describe('source maps', () => {
    it('produces a source map', () => {
      const input = `import { createLogger } from 'logs-sdk'
const log = createLogger({})`

      const result = transform(input, 'test.ts')
      expect(result).toBeDefined()
      expect(result!.map).toBeDefined()
      expect(result!.map.mappings).toBeTruthy()
    })
  })
})
