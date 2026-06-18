import type { ViteUserConfig } from 'vitest/config'
import { defineConfig } from 'vitest/config'

// annotated so the default export is emittable under isolatedDeclarations
const config: ViteUserConfig = defineConfig({
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

export default config
