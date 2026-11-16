# Error code documentation site

Each published code needs a stable public page, always. Readers: developers who click the `see:` URL, agents that fetch the page, and search engines. The URLs must match `docsBase`.

## Page template

Use the same `##` headings on each page. Put the fix early. Do not hide content in tabs, collapsed sections, or JS-rendered content.

```markdown
# {CODE}: {Short title}

Code: `{CODE}`
Level: {error|warn|suggestion|deprecation}

## What this error means

{1-3 sentences, no assumed context: what was expected vs received.}

## Why this happens

{List of the scenarios that cause it.}

## How to fix it

{Most important section: the wrong code and the corrected code.}

## Additional context

{Optional: related docs, changelog, related codes.}

## Example output

{Optional: the terminal output, so users know they are on the right page.}
```

## Deployment

- Use a static site (VitePress, Nuxt Content) with a catch-all `/e/[code]` route, or an `/errors` route in existing docs.
- Return 200 for known codes and 404 for unknown codes.
- Add frontmatter/`<meta>` data (code, level, title). Do not use an SPA that fetch-based agents cannot read.

## Keep docs in sync with code

- Keep the pages next to the definitions or in `docs/errors/`. Add the page in the same PR as the code.
- Generate an index page of all codes.
- In CI, fail if a code in `defineDiagnostics()` has no page.
