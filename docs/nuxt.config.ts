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
        { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  site: {
    name: 'Nostics',
  },

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
