---
seo:
  title: Errors woth reading
  description: Errors worth reading. Stable codes, fixes, docs URLs, reporters, and production stripping.
---

::u-page-hero
#headline
[Diagnostics SDK]{.section-eyebrow}

#title
Errors worth reading

#description
<span class="font-mono">nostics</span> helps library authors replace ad hoc error strings with stable codes, actionable fixes, docs links, and structured `Diagnostic` objects.

:::div{.diag-hero}
::diagnostic
---
log: |
  [NUXT_B2011] Plugin `./runtime/analytics.server.ts` is server-only but was registered with mode `client`.
  ├▶ fix: Rename the file or register it with mode `server`.
  ├▶ sources: modules/analytics.ts:18:5
  ╰▶ see: nuxt.com/e/b2011
---
::
:::

#links
  :::u-button
  ---
  color: primary
  size: xl
  to: /getting-started/quick-start
  trailing-icon: i-lucide-arrow-right
  ---
  Quick start
  :::

  :::u-button
  ---
  color: neutral
  icon: simple-icons-github
  size: xl
  to: https://github.com/vercel-labs/nostics
  variant: outline
  ---
  GitHub
  :::
::

::u-page-section
#headline
[What it gives you]{.section-eyebrow}

#features
  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-hash
  ---
  #title
  Stable codes

  #description
  Give every known problem a permanent code like `NUXT_B2011`. Users can search it, docs can link to it, and your wording can improve without breaking the identifier.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-check-circle
  ---
  #title
  Actionable fixes

  #description
  Put the next step next to the error. The default formatter renders the message, fix, source locations, and docs URL in one compact block.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-braces
  ---
  #title
  Typed params

  #description
  Use functions for dynamic messages and fixes. TypeScript requires the right params wherever you report the diagnostic.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-share-2
  ---
  #title
  Reporters

  #description
  Log to the console, append NDJSON to a file, POST to an endpoint, or write your own reporter.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-scissors
  ---
  #title
  Production stripping

  #description
  Use the build plugin to remove report-only diagnostics and their catalog text from production bundles.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-terminal
  ---
  #title
  Vite dev collection

  #description
  Forward browser diagnostics to a local log file during Vite dev when the browser console is not enough.
  :::
::

::u-page-section
#headline
[Start here]{.section-eyebrow}

#features
  :::u-page-feature
  ---
  icon: i-lucide-rocket
  to: /getting-started/quick-start
  ---
  #title
  Quick start

  #description
  Install the package, define two codes, and report your first diagnostic.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-list-tree
  to: /guide/defining-diagnostics
  ---
  #title
  Guide

  #description
  Learn the catalog shape, params, docs URLs, sources, causes, reporters, and build plugins.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-file-code
  to: /api/reference
  ---
  #title
  API reference

  #description
  Check imports, option names, reporter signatures, formatter shapes, and plugin options.
  :::
::
