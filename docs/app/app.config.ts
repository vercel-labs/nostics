export default defineAppConfig({
  seo: {
    titleTemplate: '%s - nostics',
    title: 'nostics',
    description:
      'Structured, typed, machine-readable diagnostics for JavaScript libraries. Stable codes, actionable fixes, docs URLs, dev-time collection.',
  },
  ui: {
    colors: {
      primary: 'amber',
      neutral: 'zinc',
    },
    button: {
      slots: {
        base: 'active:translate-y-px transition-transform duration-200',
      },
    },
    prose: {
      codeIcon: {
        bash: 'i-lucide-terminal',
        shell: 'i-lucide-terminal',
        ts: 'i-vscode-icons-file-type-typescript',
        tsx: 'i-vscode-icons-file-type-typescript',
        vue: 'i-vscode-icons-file-type-vue',
      },
    },
  },
})
