---
seo:
  title: nostics
  description: Structured, typed, machine-readable diagnostics for JavaScript libraries. Stable codes, actionable fixes, docs URLs, dev-time collection.
---

::u-page-hero
# title
Errors and warnings your users (and their agents) can actually act on.

# description
nostics turns library errors and warnings into typed, structured `Diagnostic` objects with stable codes, actionable fix instructions, and a per-code docs URL. Humans get a fix in the same glance as the message. Agents get machine-readable fields instead of regexing message text.

```bash [Sample output]
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ sources: /Users/me/projects/my-nuxt-app/nuxt.config.ts:14:3
╰▶ see: https://nuxt.com/e/b2011
```

#links
  :::u-button
  ---
  color: neutral
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
# title
What you get

#features
  :::u-page-feature
  ---
  icon: i-lucide-hash
  ---
  # title
  Stable, [organized codes]{.text-primary}

  # description
  Every diagnostic carries a permanent code (`MATH_E001`, `NUXT_B2011`). `cmd+click` jumps to the definition. Search engines index the code. Agents dispatch on it.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-box
  ---
  # title
  Structured [`Diagnostic` instances]{.text-primary}

  # description
  Extends `Error`. Carries `why`, `fix`, `docs`, `sources`, `cause`. Serializable via `toJSON()`. Survives process boundaries.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-cable
  ---
  # title
  Pluggable [reporters and formatters]{.text-primary}

  # description
  Console, file, HTTP, Vite dev-channel, or your own. ANSI, JSON, or plain. Wire several at once; their options are type-checked at the call site.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-terminal
  ---
  # title
  Browser diagnostics, [piped to your terminal]{.text-primary}

  # description
  The Vite dev collector forwards every browser diagnostic to a local log file. Agents tail it. No more "agents can't see the browser".
  :::

  :::u-page-feature
  ---
  icon: i-lucide-scissors
  ---
  # title
  [Tree-shaken]{.text-primary} from production

  # description
  The build-time plugin marks definitions as pure and guards call sites with `NODE_ENV`. Diagnostics disappear from your production bundle.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-feather
  ---
  # title
  [Zero runtime deps]{.text-primary}

  # description
  Nothing imported into your app's runtime. The build-time and dev-server bits live in their own subpath exports.
  :::
::
