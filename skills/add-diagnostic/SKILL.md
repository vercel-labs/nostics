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

- **PREFIX** — project/domain name in uppercase (e.g., `NUXT`, `MATH`, `I18N`)
- **X** — category letter: `B` (build), `R` (runtime), `C` (config), `E` (error), `W` (warning), `D` (deprecation), `I` (info)
- **NNNN** — numeric sequence

Look at existing codes in the target file to determine the prefix, category, and next available number. Codes must never be reused once published.

## Step 3: Add the Definition

Add the new entry to the `codes` object inside `defineDiagnostics()`:

```ts
CODE_NAME: {
  why: 'Static explanation of why this failed.',
  // OR with parameters:
  why: (p: { paramName: string }) => `Template with ${p.paramName}.`,
  fix: 'How to resolve the issue.', // optional but recommended
},
```

Rules:

- `why` is the only required field — it becomes `Error.message` on the resulting `Diagnostic` instance
- Parameters can appear in any template field (`why`, `fix`) — TypeScript unions them and requires them at the call site
- Always provide `fix` when the solution is known
- Use typed arrow functions for parameterized templates: `(p: { key: Type }) => string`
- Runtime fields (`cause`, `sources`) are passed at the call site, not in the definition

## Step 4: Call the Code

```ts
diagnostics.CODE_NAME.report({ paramName: 'value' })
diagnostics.CODE_NAME.throw({ paramName: 'value', cause: originalError })
```
