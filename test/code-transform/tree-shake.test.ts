import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { transform } from '../../src/code-transform/transform'

async function bundleProduction(input: string): Promise<string> {
  // First, apply the plugin transform
  const transformed = transform(input, 'entry.ts')
  const code = transformed ? transformed.code : input

  const result = await build({
    stdin: {
      contents: code,
      resolveDir: import.meta.dirname,
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
    plugins: [{
      name: 'nostics-stub',
      setup(build) {
        build.onResolve({ filter: /^nostics/ }, () => ({
          path: 'nostics',
          namespace: 'nostics-stub',
        }))
        build.onLoad({ filter: /.*/, namespace: 'nostics-stub' }, () => ({
          contents: `
            export function defineDiagnostics(opts) { return opts }
            export function createLogger(opts) { return opts }
            export const consoleReporter = { report() {} }
          `,
          loader: 'js',
        }))
      },
    }],
  })

  return new TextDecoder().decode(result.outputFiles[0].contents)
}

describe('tree-shake integration', () => {
  it('eliminates all logging code in production', async () => {
    const input = `
import { defineDiagnostics, createLogger } from 'nostics'

const diags = defineDiagnostics({
  prefix: 'TEST',
  codes: {
    E001: { message: 'Test error' },
    E002: { message: (p: { file: string }) => \`Bad file \${p.file}\` },
  },
})

const log = createLogger({ diagnostics: [diags] })

log.E001().warn()
log.E002({ file: '/bad.ts' }).error()
`
    const output = await bundleProduction(input)
    // After tree-shaking and minification, the output should be nothing
    expect(output.trim()).toBe('')
  })

  it('eliminates logging inside functions', async () => {
    const input = `
import { defineDiagnostics, createLogger } from 'nostics'

const diags = defineDiagnostics({ prefix: 'T', codes: { E1: { message: 'x' } } })
const log = createLogger({ diagnostics: [diags] })

export function handler() {
  log.E1().warn()
  return 'ok'
}
`
    const output = await bundleProduction(input)
    // The handler function should remain but logging should be gone
    expect(output).toMatchInlineSnapshot(`
      "function t(){return"ok"}export{t as handler};
      "
    `)
  })
})
