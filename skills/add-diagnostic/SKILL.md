---
name: add-diagnostic
description: "Add a new diagnostic code following the defineDiagnostics() conventions from logs-sdk"
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
  message: 'Static message.',
  // OR with parameters:
  message: (p: { paramName: string }) => `Template with ${p.paramName}.`,
  fix: 'How to resolve the issue.',        // optional but recommended
  why: 'Why this diagnostic was triggered.', // optional
  hint: 'Additional guidance.',              // optional
  level: 'error',                            // 'error' | 'warn' | 'suggestion' | 'deprecation'
                                             // defaults to 'error' if omitted
},
```

Rules:
- `message` is the only required field
- Parameters can appear in any template field (`message`, `fix`, `why`, `hint`) — TypeScript unions them all
- Always provide `fix` when the solution is known
- Set `level` explicitly if it's not `'error'`
- Use typed arrow functions for parameterized templates: `(p: { key: Type }) => string`

<!-- synced-sha: 7c2392fb4716118fa84b469b01c7eff2c057221e -->
