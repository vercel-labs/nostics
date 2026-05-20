---
name: add-diagnostic
description: 'Add a new diagnostic code following the defineDiagnostics() conventions from nostics'
user-invocable: true
allowed-tools: Read Grep Glob Edit Write
---

# Add a New Diagnostic Code

## Step 1: Find the Target File

Locate the file containing the `defineDiagnostics()` call where the new code should be added.

Use Grep to search for `defineDiagnostics` across the project.

## Step 2: Determine the Code Identifier

Diagnostic codes follow the pattern `PREFIX_XNNNN`:

- **PREFIX**: project/domain name in uppercase (e.g., `NUXT`, `MATH`, `I18N`)
- **X**: category letter. `B` (build), `R` (runtime), `C` (config), `E` (error), `W` (warning), `D` (deprecation), `I` (info)
- **NNNN**: numeric sequence

Check existing codes in the file to pick the prefix, category, and next free number. Never reuse a published code.

## Step 3: Add the Definition

Add the new entry to the `codes` object inside `defineDiagnostics()`:

```ts
CODE_NAME: {
  why: 'Static explanation of why this failed.',
  // OR with parameters:
  why: (p: { paramName: string }) => `Template with ${p.paramName}.`,
  fix: 'How to resolve the issue.', // optional but recommended
  docs: 'https://example.com/custom-page', // optional — overrides docsBase, or `false` to opt out
},
```

Rules:

- `why` is the only required field. It becomes `Error.message` on the resulting `Diagnostic` instance.
- Parameters can appear in any template field (`why`, `fix`). TypeScript unions them and requires them at the call site.
- Always provide `fix` when the solution is known
- Use typed arrow functions for parameterized templates: `(p: { key: Type }) => string`
- Runtime fields (`cause`, `sources`) are passed at the call site, not in the definition
- `docs?: string | false` overrides `docsBase` for this code, or opts out entirely with `false`

## Step 4: Call the Code

```ts
diagnostics.CODE_NAME({ paramName: 'value' })
throw diagnostics.CODE_NAME({ paramName: 'value', cause: originalError })
```
