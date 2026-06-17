// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    name: 'global',
    pnpm: true,
    ignores: [
      'PLAN.md',
      '.context/**',
      'skills/**/*.md',
      // generated .d.ts artifacts from `pnpm -C demo-lib run test` (tsc);
      // gitignored via demo-lib/.gitignore, which the root config doesn't read
      'demo-lib/dts-check/**',
      // Docs snippets are illustrative (incomplete TS, pseudo-types, etc).
      // Lint the markdown structure, not the embedded code blocks.
      'docs/content/**/*.md',
    ],
    rules: {
      'node/prefer-global/process': ['error', 'always'],
    },
  },
  {
    // MDC slot specifiers (e.g. `#title`, `#code`) look like H1 headings to
    // the markdown plugin, so disable the heading-shape rules for docs content.
    files: ['docs/content/**/*.md'],
    name: 'docs',
    rules: {
      'markdown/no-multiple-h1': 'off',
      'markdown/heading-increment': 'off',
      'markdown/no-missing-atx-heading-space': 'off',
    },
  },
)
