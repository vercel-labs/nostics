import type { TrackedExportsMap } from './transform'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { transform } from './transform'

async function bundleProduction(input: string): Promise<string> {
  const id = join(import.meta.dirname, '../../demo-lib/src/entry.ts')
  const trackedExportsMap: TrackedExportsMap = new Map()
  // First, apply the plugin transform
  const transformed = transform(input, id, undefined, trackedExportsMap)
  const code = transformed ? transformed.code : input

  const result = await build({
    stdin: {
      contents: code,
      resolveDir: dirname(id),
      loader: 'ts',
    },
    bundle: true,
    write: false,
    minify: true,
    treeShaking: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    format: 'esm',
    // Mark nostics as external so we can see if it's still imported
    // Actually, we need to provide a stub so esbuild can resolve it
    plugins: [
      {
        name: 'nostics-stub',
        setup(build) {
          build.onResolve({ filter: /^nostics/ }, () => ({
            path: 'nostics',
            namespace: 'nostics-stub',
          }))
          build.onLoad({ filter: /.*/, namespace: 'nostics-stub' }, () => ({
            contents: `
            export function defineDiagnostics(opts) { return opts }
            export function reporterLog() {}
            export function devReporter() {}
            export const consoleReporter = { report() {} }
          `,
            loader: 'js',
          }))
        },
      },
      {
        name: 'nostics-transform',
        setup(build) {
          build.onLoad({ filter: /demo-lib\/src\/.*\.ts$/ }, (args) => {
            const source = readFileSync(args.path, 'utf-8')
            const transformed = transform(source, args.path, undefined, trackedExportsMap)
            return {
              contents: transformed?.code ?? source,
              loader: 'ts',
            }
          })
        },
      },
    ],
  })

  return new TextDecoder().decode(result.outputFiles[0].contents)
}

describe('tree-shake integration', () => {
  it('eliminates all diagnostic call code in production', async () => {
    const input = `
import { diagnostics } from './diagnostics'

diagnostics.MATH_E001()
diagnostics.MATH_W001({ n: -1 })
`
    const output = await bundleProduction(input)
    // After tree-shaking and minification, the output should be nothing
    expect(output.trim()).toBe('')
  })

  it('eliminates diagnostic calls inside functions', async () => {
    const input = `
import { diagnostics } from './diagnostics'

export function handler() {
  diagnostics.MATH_E001()
  return 'ok'
}
`
    const output = await bundleProduction(input)
    // The handler function should remain but the diagnostic call should be gone.
    expect(output.trim()).toMatch(/^function \w\(\)\{return"ok"\}export\{\w as handler\};$/)
    expect(output).not.toContain('E1')
    expect(output).not.toContain('defineDiagnostics')
  })
})
