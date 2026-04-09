// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
    ignores: ['PLAN.md', '.context/**', 'skills/**/*.md'],
  },
)
