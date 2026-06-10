import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  extends: ['docus'],

  modules: [
    '@nuxt/fonts',
    // '@comark/nuxt',
    '@vercel/analytics',
    '@vercel/speed-insights',
  ],

  app: {
    head: {
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        {
          rel: 'icon',
          href: '/favicon-96x96.png',
          type: 'image/png',
          sizes: '96x96',
        },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon.png',
          sizes: '180x180',
        },
      ],
    },
  },

  site: {
    name: 'Nostics',
    // for og images
    url: 'https://nostics.dev',
  },

  // OG images: Docus already auto-generates per-page social images via
  // nuxt-og-image (zeroRuntime mode, rendered at build time with @takumi-rs).
  // Doc pages use the `Docs` template, the landing page uses `Landing`.
  //
  // To customize the design later, override Docus' templates by creating
  // project-layer components (they take precedence over the extended layer):
  //   app/components/OgImage/Docs.takumi.vue       (props: title, description, headline)
  //   app/components/OgImage/Landing.takumi.vue    (props: title, description)
  // Keep the `.takumi.vue` suffix so zeroRuntime renders them at build time.
  // Reference originals: node_modules/docus/app/components/OgImage/*.takumi.vue
  //
  // Global defaults (fonts, cache, fallback emoji set, etc.) go here:
  // ogImage: {
  //   zeroRuntime: true,
  //   defaults: {
  //     // component: 'Docs',
  //     // width: 1200,
  //     // height: 630,
  //   },
  // },
  //
  // Per-page override via frontmatter (static image instead of generated):
  //   seo:
  //     ogImage: /og/my-custom-image.png

  content: {
    experimental: {
      sqliteConnector: 'native',
    },
    build: {
      markdown: {
        highlight: {
          langs: ['tsx', 'vue', 'html', 'markdown', 'bash', 'shell'],
        },
      },
      // transformers: ['~~/utils/comark-transformers.ts'],
    },
  },

  colorMode: {
    preference: 'dark',
  },

  css: ['~/assets/css/main.css'],

  fonts: {
    families: [
      { name: 'Geist', weights: [400, 500, 600, 700], global: true },
      { name: 'Geist Mono', weights: [400, 500, 600, 700], global: true },
    ],
  },

  llms: {
    domain: 'https://nostics.dev',
  },

  routeRules: {
    '/': { prerender: true },
    // '/plugins/built-in/highlight': { redirect: '/plugins/built-in/syntax-highlight' },
  },
})
