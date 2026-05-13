import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      exclude: ['./src/mock-warn.ts'],
    },
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
})
