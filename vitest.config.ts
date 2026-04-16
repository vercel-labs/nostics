import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'test/**/*.test.ts',
    ],
    server: {
      deps: {
        inline: ['vitest-package-exports'],
      },
    },
    typecheck: {
      include: [
        'src/**/*.test-d.ts',
        'test/**/*.test-d.ts',
      ],
      enabled: true,
    },
  },
})
