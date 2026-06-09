export default defineAppConfig({
  seo: {
    titleTemplate: '%s - nostics',
    title: 'nostics',
    description:
      'Errors worth reading. Stable codes, fixes, docs URLs, reporters, and production stripping.',
  },
  ui: {
    colors: {
      primary: 'white',
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
