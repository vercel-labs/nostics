---
name: add-diagnostic
description: 'Add a new diagnostic code following the defineDiagnostics() conventions from nostics'
user-invocable: true
allowed-tools: Read Grep Glob Edit Write
license: MIT
---

# Add a diagnostic code

1. **Find the catalog**: grep `defineDiagnostics`. If there are many, pick by area.
2. **Pick the code**: `PREFIX_XNNNN`. `PREFIX` is the project name in uppercase (`NUXT`, `I18N`). `X` is the area: `B` build, `R` runtime, `C` config, `D` deprecation. `NNNN` is the next free number. Never rename or reuse a published code.
3. **Add the entry**:

   ```ts
   LIB_R0001: {
     why: (p: { hook: string }) => `${p.hook}() must run at the top of setup().`, // required
     fix: 'Move the call into setup() or a composable it calls.', // add when the fix is known
     docs: 'https://example.com/custom', // optional: overrides docsBase, `false` opts out
   },
   ```

   `why` says what is wrong, `fix` says what to do: do not repeat text between them. Params of `why` and `fix` are merged and required at the call site. `cause` and `sources` go at the call site, not in the definition.

4. **Call it**: `diagnostics.LIB_R0001({ hook })` reports, `throw diagnostics.LIB_R0001({ hook, cause: err })` reports and raises. To check a caught error: `diagnostics.LIB_R0001.is(err)`.

More details: the `nostics` skill.
