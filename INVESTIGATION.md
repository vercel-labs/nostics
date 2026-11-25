# Investigation: severity and "printed" mark at the reporter layer

Context: nuxt/nuxt#37203 adds `{ method: 'error' }` at each `throw xDiagnostics.CODE(...)` site, an ESLint rule to enforce it, and a `Symbol.for('nuxt.diagnostic.reported')` mark set in its reporter.

## Summary

- **Decision: per-code default reporter options in the definition**, next to `why` and `fix`: `NUXT_B8001: { why, fix, report: { method: 'error' } }`. Typed from the reporters, call-site options override it, no change to `Diagnostic` or to reporters. Prod mode ignores it (accepted). Cost: +18 B minified, +11 B gzip for `defineDiagnostics`, 0 B for `defineProdDiagnostics`.
- Nuxt data (PR head `bdf9763cd`): 269 codes, 77 thrown codes at 87 throw sites. 65 throw sites are `NUXT_B` codes in Node-only catalogs (no prod branch). 22 are `NUXT_E` runtime codes, where the prod reporter already prints all with `console.error`. Only 1 code (`NUXT_B2009`) is both thrown and report-only.
- A reporter **cannot** know if the diagnostic is thrown. It runs inside the handle call, before the `throw` statement runs. A per-code severity is an approximation that is correct for 76 of 77 Nuxt codes.
- The "printed" mark is a reporter concern. Keep it in Nuxt's reporter, not in nostics core. It does not break re-reporting.

## Where can the reporter get the severity?

A reporter gets `(diagnostic, options)`. In dev, `diagnostic` has `code`, `why`, `fix`, `docs`, `data`. In prod (`defineProdDiagnostics`), it has only `code`, `docs`, `cause` and `sources`. The only inputs that are the same in both modes are `diagnostic.code` and the call-site options.

### Option A: status quo, per-call `{ method: 'error' }`

- API: `throw d.CODE(params, { method: 'error' })`.
- Dev / prod: works in both.
- Bundle cost: one small object per surviving call site.
- Typing: already typed.
- Drawbacks: about 60 Nuxt call sites, and a name-based ESLint rule to enforce it. Noise at the call site for a value that is a property of the code.

### Option B: method as a function of the diagnostic (rejected)

```ts
createConsoleReporter({ method: (d) => (ERROR_CODES.has(d.code) ? 'error' : 'warn') })
```

- Works in dev and prod (reads only `d.code`), small prod cost (the code list).
- **Rejected**: the info of a diagnostic is in two places (the catalog and the code list). A new thrown code must be added to two places.

### Option C: code-naming convention (e.g. `E` = error)

- A special case of option B. The nostics convention says the letter is the area, not the severity, and published codes must never be renamed. Not possible for Nuxt.

### Option D (chosen): per-code default reporter options in the definition

```ts
defineDiagnostics({
  reporters: [createConsoleReporter()],
  codes: {
    NUXT_B8001: { why: '...', fix: '...', report: { method: 'error' } },
  },
})
```

- Dev: the handle merges `{ ...def.report, ...callSiteOptions }` and passes it to every reporter. The call site wins key by key.
- Prod: `defineProdDiagnostics` has no catalog, so it ignores `report`. Prod reporters get only the call-site options. This is accepted: for Nuxt, the build-time catalogs have no prod branch, and the runtime prod reporter has its own policy (`console.error` for all surviving calls).
- Bundle cost: +18 B minified, +11 B gzip in `defineDiagnostics` (992 to 1010 B, 586 to 597 B, esbuild `--minify`). The `report` fields are in the dev catalog, so they are removed with it in prod. No change in `defineProdDiagnostics`.
- `nosticsStrip`: no change. It does not read definition fields.
- Typing: `report` is checked against the intersected reporter options: a wrong value, an unknown key, or a `report` with no reporter options is a type error. Call-site types do not change (required reporter options stay required at the call site).
- No change to `Diagnostic`, to reporters, or to `createConsoleReporter`. It is generic: any reporter option can have a per-code default.
- Drawbacks: prod does not apply it (documented). It is still "this code is an error", not "this call throws" (see below).

### Option E: reporter factory that knows the catalog

- API: e.g. `reporters: (codes) => [...]`. Large API change, fails in prod like option D, no benefit over D.

### Option F: split catalogs by severity (old skill guidance)

- No API. Drawback for Nuxt: catalogs are split by domain with code ranges. Splitting them again by severity doubles them and breaks `group.is(err)` per domain.

### Option G: a different handle for thrown diagnostics (`throw d.CODE.raise(params)`)

- The only way for a reporter to really know "thrown". Still a change at each call site, a new API on each handle, and `throw d.CODE()` stays valid, so a lint rule is still needed. Not better than A.

## Can a reporter know the diagnostic is thrown?

**No.** The handle builds the diagnostic, calls every reporter, then returns it. The `throw` statement runs after the reporters returned. JavaScript has no hook for "this value is about to be thrown", and the stack does not show it. Only the call site knows (options A and G). A per-code severity (option D) is a good approximation: in Nuxt, a code is almost always used in one way.

In prod, report-only calls are removed by `nosticsStrip` (or by the `NODE_ENV` guard), so most calls that survive are `throw`. This is why Nuxt's runtime prod reporter can print everything with `console.error`. But `return`/assigned/argument calls also survive, so "survived" is not exactly "thrown".

## The "printed" mark

- It is a **reporter concern**. Only a reporter that writes to a place a human sees (console, logger) can say "printed". A fetch, file or dev-server reporter does not mean a human saw it.
- Nuxt already sets it in its own reporter. This is the correct layer. nostics does not need to change for it.
- Re-reporting does not break:
  - Same code, many calls: each call builds a new instance, so the mark of one instance has no effect on the next.
  - Same instance reported again: `Object.defineProperty(d, sym, { value: true })` a second time does not throw (same attributes, checked with node). The reporter does not read the mark, so it prints again.
  - Do not make a reporter skip a marked instance. Then re-reporting would be silent.
- Limits to document (for Nuxt and nuxt/cli):
  - The mark is lost on copies: `structuredClone` and `toJSON()` drop symbol properties (checked with node). Then the CLI prints again: a duplicate, not a lost error.
  - When a bundler rewraps the diagnostic, the mark is on `err.cause`, not on `err`. The CLI must walk the `cause` chain.
  - If the logger level hides the output, the reporter still sets the mark. Then the CLI skips it and the error is never shown. Nuxt's reporter should set the mark only when the logger level shows the method.
- If more libraries need the same mark later, nostics could export `markPrinted(d)` / `wasPrinted(err)` (a `Symbol.for('nostics.printed')` key and a `cause` walk), called only by `createConsoleReporter`. Not needed now.

## Implementation (option D)

Branch `explore/reporter-severity` (local commit only, not pushed).

- `src/diagnostic.ts`:
  - `DiagnosticDefinition.report?: object`.
  - `defineDiagnostics()` checks each `report` against the reporter options (the `CheckedDiagnosticCodes` constraint of `Codes`), and the handle merges `{ ...def.report, ...reporterOptions }`.
- Tests (assert console output):
  - `src/diagnostic.test.ts`: a code with `report: { method: 'error' }` prints with `console.error`, a code without it with `console.warn`; the call site overrides the code default; options of other reporters are kept (merged, not replaced).
  - `src/prod-diagnostics.test.ts`: with one shared `reporters` in a dev/prod pair, dev prints the code with `console.error` and prod with the reporter default `console.warn`; call-site options still work in prod.
  - `src/diagnostic.test-d.ts`: call-site args are unchanged; a wrong method, an unknown key, and `report` with no reporters are type errors.
  - The 3 runtime tests for the code default fail without the merge line and pass with it.
- Docs: `docs/content/2.guide/1.defining-diagnostics.md` (reporter options per code), `docs/content/2.guide/2.reporters-and-formatters.md` (console reporter, defaults per code), `docs/content/2.guide/3.production-builds.md` (prod ignores `report`), `docs/content/4.api/1.reference.md` (definition), `skills/nostics/SKILL.md`. API snapshot refreshed by `pnpm build`.

Results:

- `pnpm exec vitest run`: 13 files, 247 tests passed, no type errors.
- `pnpm typecheck`: passes (after `pnpm build`).
- `pnpm build`: passes (the first run updates the tsnapi snapshot).
- `pnpm lint:fix`: clean.

## What Nuxt would change

1. Add `report: { method: 'error' }` to the 77 thrown codes in the catalogs.
2. Remove `{ method: 'error' }` from the throw sites.
3. For `NUXT_B2009`: set `report: { method: 'error' }` and pass `{ method: 'warn' }` at the report-only default in `breakCircularDependencies`.
4. Replace the ESLint rule with a drift check: every code with a `throw xDiagnostics.CODE` site has `report: { method: 'error' }`.
5. Keep the `reported` mark in the reporter, set only when the logger level shows the output.
