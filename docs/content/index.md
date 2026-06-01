---
seo:
  title: nostics
  description: Structured, typed, machine-readable diagnostics for JavaScript libraries. Stable codes, actionable fixes, docs URLs, dev-time collection.
---

::u-page-hero
#headline
[Diagnostics SDK]{.section-eyebrow}

#title
Errors and warnings your users (and their <span class="font-mono">agents</span>) can actually act on.

#description
<span class="font-mono">nostics</span> turns library errors and warnings into typed, structured `Diagnostic` objects with stable codes, actionable fix instructions, and a per-code docs URL. Humans get a fix in the same glance as the message. Agents get machine-readable fields instead of regexing message text.

:::div{.diag-hero}
::diagnostic
---
log: |
  [NUXT_B2011] Invalid plugin `/plugins/bad.ts`.
  ├▶ fix: Pass a `src` path to `addPlugin()`.
  ├▶ sources: nuxt.config.ts:14:3
  ╰▶ see: nuxt.com/e/b2011
---
::
:::

#links
  :::u-button
  ---
  color: primary
  size: xl
  to: /getting-started/introduction
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: simple-icons-github
  size: xl
  to: https://github.com/vercel-labs/nostics
  variant: outline
  ---
  Star on GitHub
  :::
::

::u-page-section
#headline
[Capabilities]{.section-eyebrow}

#title
What you get

#features
  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-hash
  ---
  #title
  Stable, [organized codes]{.text-primary}

  #description
  Every diagnostic carries a permanent code (`MATH_E001`, `NUXT_B2011`). `cmd+click` jumps to the definition. Search engines index the code. Agents dispatch on it.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-box
  ---
  #title
  Structured [`Diagnostic` instances]{.text-primary}

  #description
  Extends `Error`. Carries `why`, `fix`, `docs`, `sources`, `cause`. Serializable via `toJSON()`. Survives process boundaries.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-cable
  ---
  #title
  Pluggable [reporters and formatters]{.text-primary}

  #description
  Console, file, HTTP, Vite dev-channel, or your own. ANSI, JSON, or plain. Wire several at once; their options are type-checked at the call site.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-terminal
  ---
  #title
  Browser diagnostics, [piped to your terminal]{.text-primary}

  #description
  The Vite dev collector forwards every browser diagnostic to a local log file. Agents tail it. No more "agents can't see the browser".
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-scissors
  ---
  #title
  [Tree-shaken]{.text-primary} from production

  #description
  The build-time plugin marks definitions as pure and guards call sites with `NODE_ENV`. Diagnostics disappear from your production bundle.
  :::

  :::u-page-feature
  ---
  class: dev-card
  icon: i-lucide-feather
  ---
  #title
  [Zero runtime deps]{.text-primary}

  #description
  Nothing imported into your app's runtime. The build-time and dev-server bits live in their own subpath exports.
  :::
::

::u-page-c-t-a
---
variant: subtle
links:
  - label: Get started
    to: /getting-started/introduction
    color: primary
    trailingIcon: i-lucide-arrow-right
    size: xl
  - label: Star on GitHub
    to: https://github.com/vercel-labs/nostics
    color: neutral
    variant: outline
    icon: i-simple-icons-github
    size: xl
---
#title
Ship errors agents can act on

#description
Stable codes, a fix in the message, machine-readable fields. Add <span class="font-mono">nostics</span> to your library and stop making people regex your error strings.
::
