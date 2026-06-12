import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'nostics',
          include: ['src/**/*.test.ts'],
          server: {
            deps: {
              inline: ['vitest-package-exports'],
            },
          },
          typecheck: {
            include: ['src/**/*.test-d.ts'],
            enabled: true,
          },
        },
      },
      'packages/*',
    ],
    coverage: {
      exclude: ['./src/mock-warn.ts'],
    },
  },
})
