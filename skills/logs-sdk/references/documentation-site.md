# Documentation Site and Error Code Registry

## Table of Contents

- [Why a documentation site matters](#why-a-documentation-site-matters)
- [Setting up docsBase](#setting-up-docsbase)
- [Documentation page structure](#documentation-page-structure)
- [Page template](#page-template)
- [Deployment recommendations](#deployment-recommendations)
- [Keeping docs in sync with code](#keeping-docs-in-sync-with-code)
- [Optimizing for AI agent consumption](#optimizing-for-ai-agent-consumption)

## Why a documentation site matters

Every diagnostic code should have a dedicated, publicly accessible documentation page. This serves three audiences:

1. **Developers** encountering the error in their terminal or logs can click the `see:` URL and get immediate guidance
2. **AI agents** (Claude, Copilot, etc.) can fetch the page content to provide contextual help when a user pastes an error
3. **Search engines** index these pages so developers searching for `NUXT_B2011` find the answer directly

## Setting up docsBase

The `docsBase` option in `defineDiagnostics()` controls the auto-generated `docs` URL. It can be a string or a function:

```ts
// Function form — full control over the URL
const diagnostics = defineDiagnostics({
  docsBase: code => `https://nuxt.com/e/${code.replace('NUXT_', '').toLowerCase()}`,
  codes: {
    NUXT_B2011: { message: '...' },
  },
})
// diagnostics.NUXT_B2011().docs → 'https://nuxt.com/e/b2011'
```

```ts
// String form — code appended automatically as ${docsBase}/${code.toLowerCase()}
const diagnostics = defineDiagnostics({
  docsBase: 'https://example.com/errors',
  codes: {
    MY_E001: { message: '...' },
  },
})
// diagnostics.MY_E001().docs → 'https://example.com/errors/my_e001'
```

Plan your URL structure accordingly.

## Documentation page structure

Each error code page (e.g. `https://nuxt.com/e/b2011`) should follow this structure. The content must be both human-readable and optimized for AI agent consumption — use clear headings, concise language, and structured sections.

### Required sections

**Title and code identifier**

```markdown
# NUXT_B2011: Invalid plugin — src option is required

Code: `NUXT_B2011`
Level: error
```

Start with the code and a short human-readable title. Include the code and the severity level.

**What this error means**

```markdown
## What this error means

This error occurs when a plugin is registered via `addPlugin()` without providing a
valid `src` path. Nuxt requires every plugin to have a source file so it can be
resolved and included in the build.
```

Explain the error in plain language. Assume the reader has no prior context — describe what the system expected vs what it received. This section is the primary content AI agents will use to explain the error to users.

**Why this happens**

```markdown
## Why this happens

Common causes:

- Passing an object to `addPlugin()` without a `src` property
- Passing `undefined` or `null` as the plugin path
- A module is constructing a plugin object dynamically and the `src` field is missing
  due to a conditional branch or typo
```

List the concrete scenarios that trigger this diagnostic. Use bullet points. Each bullet should be a specific, recognizable situation the developer might be in.

**How to fix it**

```markdown
## How to fix it

Ensure every call to `addPlugin()` includes a valid `src` path:

\```ts
// Wrong
addPlugin({ name: 'my-plugin' })

// Correct
addPlugin({ src: resolve('./runtime/my-plugin'), name: 'my-plugin' })

// Also correct — pass a string directly
addPlugin(resolve('./runtime/my-plugin'))
\```

If the plugin path is computed dynamically, verify the variable is defined before
passing it to `addPlugin()`.
```

Provide concrete code examples showing the wrong pattern and the corrected version. This is the most important section — it should be copy-pasteable.

### Optional sections

**Additional context**

```markdown
## Additional context

- This validation was added in Nuxt 3.2
- If you are writing a Nuxt module, see the [Module Author Guide](https://nuxt.com/docs/guide/going-further/modules)
- Related codes: [NUXT_B1001](./nuxt_b1001) (template compilation), [NUXT_B3005](./nuxt_b3005) (module resolution)
```

Link to related documentation, changelog entries, or related diagnostic codes.

**Example diagnostic output**

```markdown
## Example output

\```
[NUXT_B2011] Invalid plugin `/plugins/bad.ts`. src option is required.
├▶ why: The plugin object was passed without a src path
├▶ fix: Pass a string path or an object with a `src` property to `addPlugin()`.
├▶ hint: Check your module's addPlugin() calls
╰▶ see: https://nuxt.com/e/b2011
\```
```

Show what the user actually sees in their terminal so they can confirm they're on the right page.

## Page template

Use this template for each error code page:

```markdown
# {CODE}: {Short title}

Code: `{CODE}`
Level: {error|warn|suggestion|deprecation}

## What this error means

{Plain-language explanation of the diagnostic. 1-3 sentences.}

## Why this happens

{Bulleted list of concrete scenarios that trigger this diagnostic.}

## How to fix it

{Code examples showing the wrong pattern and the corrected version.}

## Additional context

{Links to related docs, changelog, or related diagnostic codes. Optional.}

## Example output

{Terminal output showing the formatted diagnostic. Optional.}
```

## Deployment recommendations

Host the error code pages on a public URL that matches your `docsBase`:

- **GitHub Pages or static site generator** (VitePress, Nuxt Content, etc.) — create a directory of markdown files, one per code, with a catch-all route at `/e/[code].md`
- **Dedicated `/errors` or `/e` route** in your existing documentation site
- Ensure pages return proper HTTP status codes (200 for valid codes, 404 for unknown codes) so agents and crawlers can distinguish valid codes from missing ones
- Use `<meta>` tags or frontmatter for structured data (code, level, title) to improve agent and search engine consumption
- Keep pages lightweight — avoid heavy JavaScript or SPAs that block content rendering for fetch-based agents

## Keeping docs in sync with code

- Store documentation markdown alongside your diagnostic definitions or in a dedicated `docs/errors/` directory
- Generate an index page listing all codes with their messages and levels
- In CI, validate that every code in `defineDiagnostics()` has a corresponding documentation page — fail the build if a page is missing
- When adding a new diagnostic code, add the documentation page in the same PR

## Optimizing for AI agent consumption

Pages should be structured so that an AI agent fetching the URL can extract the relevant information without ambiguity:

- Use consistent heading hierarchy (`##` for sections)
- Put the most actionable content (fix instructions) early
- Avoid hiding critical information in collapsed sections, tabs, or JavaScript-rendered content
- Include the code in the page title and body so keyword matching works
- Keep code examples self-contained — an agent should be able to suggest the fix from the page content alone
