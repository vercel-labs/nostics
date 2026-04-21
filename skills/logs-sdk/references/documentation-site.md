# Error Code Documentation Pages

Every published diagnostic code should have a dedicated page at the URL its `docs` field resolves to. Humans land there from the `see:` link in terminal output; agents fetch it to explain an error they've been handed.

For `docsBase` setup (string vs function form), see `api-reference.md`. This file covers the *content* behind those URLs.

## Page template

```markdown
# {CODE}: {short title}

Code: `{CODE}`
Level: {error | warn | suggestion | deprecation}

## What this error means

{Plain-language explanation. 1–3 sentences. Describe what the system expected
vs what it received. This is the primary section AI agents read.}

## Why this happens

- {Concrete scenario 1}
- {Concrete scenario 2}
- {Concrete scenario 3}

## How to fix it

\`\`\`ts
// Wrong
...

// Correct
...
\`\`\`

{Short prose after the snippet if a pattern needs explanation.}

## Related

- {Links to related codes, changelog entries, or guides. Optional.}

## Example output

\`\`\`
[{CODE}] {message}
├▶ fix: {fix}
╰▶ see: {URL}
\`\`\`

{Optional — helps users confirm they're on the right page.}
```

## Section guidance

**Title + code block.** Start with the code and a short title. Repeat the code and level below as a machine-readable header — agents and search engines latch onto this.

**What this error means.** Plain prose. Assume zero prior context. Describe expected vs actual. No code here — keep it narrative. This is the section an agent paraphrases to the user.

**Why this happens.** Bulleted concrete scenarios the developer might be in. Avoid abstractions — "passing `undefined`", "a conditional branch that forgets to set `src`", not "invalid input handling". Recognizable triggers, not taxonomy.

**How to fix it.** Copy-pasteable code. Show the wrong pattern and the corrected one side by side. This section is the payload — agents often skip directly here. Prefer showing over telling.

**Related / Example output.** Optional. Use "Related" for links to adjacent codes or deeper docs. Use "Example output" so users can eyeball the terminal text they're seeing and confirm they're on the right page.

## Deployment

Host at a URL that matches your `docsBase`. VitePress, Nuxt Content, Astro, or any static site generator works — one markdown file per code under `/e/[code].md` (or the equivalent).

Non-negotiable:
- Pages render in plain HTML without JavaScript. Agents using `fetch`-based tools will not execute scripts, and neither will most crawlers.
- Unknown codes return 404, not 200. Agents distinguish "valid code I couldn't find docs for" from "docs are missing" via status.
- The code string appears in the page title and in the body. Keyword search is how users arrive.

Nice to have:
- Frontmatter (`code`, `level`, `title`) for structured consumption.
- An index page listing every code with its message and level.

## Optimizing for AI-agent consumption

When an agent fetches the docs URL, it's usually because the inline `fix` wasn't enough. Write so the agent can extract the action without ambiguity:

- Consistent heading hierarchy — `##` for sections, never jump levels.
- Fix instructions **early**. If an agent stops reading after the first two sections, it should still have the fix.
- No collapsed sections, tabs, or JS-rendered content hiding critical info.
- Self-contained code examples. An agent should be able to suggest the fix from the page content alone — don't require "see linked repo for setup".
- Echo the code string in headings and body. Exact-match matters for both agents and search.

## Keeping docs in sync with code

The code registry is authoritative. A diagnostic without a docs page produces a broken `see:` link; a docs page without a code is noise. Enforce the invariant in CI:

```ts
// scripts/check-docs.ts
import { readdirSync, existsSync } from 'node:fs'
import { diagnostics } from '../src/diagnostics'

const docsDir = new URL('../docs/e/', import.meta.url).pathname
const missing: string[] = []

for (const code of diagnostics.codes()) {
  const page = `${docsDir}${code.toLowerCase()}.md`
  if (!existsSync(page)) missing.push(code)
}

if (missing.length) {
  console.error(`Missing docs pages:\n${missing.map(c => `  - ${c}`).join('\n')}`)
  process.exit(1)
}
```

Add a reverse check too — every docs page should correspond to a known code (`diagnostics.has(code)`), so deleting a code from the registry flags its stale doc.

Add new codes and their docs page in the same PR. The `/add-diagnostic` skill (if installed) handles this flow.
