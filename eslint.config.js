// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
    ignores: ['PLAN.md', '.context/**', 'skills/**/*.md'],
    rules: {
      'node/prefer-global/process': ['error', 'always'],
    },
  },
  {
    // MDC slot specifiers (e.g. `# title`, `# code`) look like H1 headings to
    // the markdown plugin, so disable the heading-shape rules for docs content.
    files: ['docs/content/**/*.md'],
    rules: {
      'markdown/no-multiple-h1': 'off',
      'markdown/heading-increment': 'off',
    },
  },
)
