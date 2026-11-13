# Migrate errors and warnings to nostics

Change a library's user-facing errors and warnings into a catalog of stable diagnostic codes **without a change in runtime behavior**. API: `../SKILL.md`.

## What to migrate

Find `console.warn`, `console.error`, `warn(...)` helpers, `throw new Error(...)`, `Promise.reject(new Error(...))`. Skip tests, fixtures, snapshots, generated output, and debug `console.log`s.

Migrate:

- dev warnings that report and continue
- warnings followed by a recovery or fallback (replace only the report)
- user-facing thrown or rejected `Error`s (the diagnostic becomes the thrown/rejected value)
- deprecation notices
- build/config errors caused by a user file: pass **both** `cause` (the original error) and `sources` (the file), because the JS stack points inside the library

Do **not** migrate:

- **structured errors that code inspects** (type fields, symbols, `isXxxError()` guards, `instanceof`): they are control flow. If one is also user-facing, add a separate dev-only report with the error as `cause`. Never replace the error object.
- **catch blocks that log a platform error and fall back** (`history.pushState`, storage quota) when the library cannot name a cause or a fix. Keep the plain log. This does not apply to errors from user files: those become diagnostics with `cause` and `sources`.
- anything where the diagnostic only says "an operation failed". A diagnostic must name a likely user-code problem or a concrete fix.

## Keep the behavior

The dev guard can be `process.env.NODE_ENV !== 'production'` or a project constant. Below it is `DEV`.

- Keep all existing dev guards. If a throw only happened in dev, it must stay dev-only.
- Do not add guards. Note: an unguarded report-only call becomes strippable, so `nosticsStrip` removes it from production. That is usually the goal. If the library reports in production on purpose, ask the maintainer.
- Keep throw vs reject, timing, recovery code, returned fallbacks, and structured error shapes.
- A migrated throw has the `why` text as its message. Update tests that assert the old text to assert the code.

## Catalog shape

One catalog file per library area (one `src/diagnostics.ts` is fine for small libraries), exported directly, with no factory wrappers and no deep barrels (see `nosticsStrip`). Add `nostics` to `dependencies`, not `devDependencies`.

```ts
import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://example.com/e/${code.toLowerCase()}`,
  reporters: [/*#__PURE__*/ createConsoleReporter()],
  codes: {
    LIB_R0001: {
      why: (p: { hook: string }) => `${p.hook}() must be called at the top of a setup function.`,
      fix: 'Move the call into setup() or a composable called by setup().',
    },
  },
})
```

- Codes and the `why`/`fix` split follow the SKILL.md conventions. A runtime warning is `R`, not `D`.
- **Do not copy the old warning into `why`.** Most warnings contain the diagnosis and the remedy. Split them:

  ```ts
  // before:  warn(`A \`hash\` should start with "#". Replace "${hash}" with "#${hash}".`)

  // ❌ the remedy is in why and again in fix
  { why: (p) => `A \`hash\` should start with "#". Replace "${p.hash}" with "#${p.hash}".`,
    fix: 'Prefix the hash with "#".' }

  // ✅
  { why: (p) => `A \`hash\` should start with "#" but received "${p.hash}".`,
    fix: (p) => `Prepend "#": use "#${p.hash}".` }
  ```

- Do not lose extra `console.warn` arguments: an error becomes `cause`; data goes into `why` (e.g. `JSON.stringify(p.value)`).
- `docsBase` is optional. If the project has no error-page URL scheme, propose one to the maintainer. Do not invent pages. When per-code `docs` point at `#hash` anchors, verify each anchor in the built HTML (grep `id=`). Custom slugifiers can keep the case and a trailing hyphen (`#Using-the-store-outside-of-setup-`).

## Call-site patterns

| Before                                      | After                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DEV && warn(msg)`                          | `DEV && diagnostics.LIB_R0001(params)`                                                                 |
| warn, then recover/fallback                 | diagnostic, then the same recovery                                                                     |
| warn, then `throw new Error(...)`           | `throw diagnostics.LIB_R0002(params)`                                                                  |
| warn, then `Promise.reject(new Error(...))` | `return Promise.reject(diagnostics.LIB_R0003(params))`                                                 |
| `console.error(...)`                        | `diagnostics.LIB_B0001(params, { method: 'error' })`                                                   |
| caught error from a user file               | `diagnostics.LIB_B0002({ ...params, cause: err, sources: ['src/file.ts:10:5'] }, { method: 'error' })` |
| structured/internal error                   | no change                                                                                              |

`throw diagnostics.CODE(params)` reports **and** throws. For warn-then-throw, the output does not change. For a bare `throw new Error(...)`, a reporter adds a second copy of the message. Put codes that are only thrown (config validators, fatal asserts) in a catalog with **no reporters**, and keep warnings in a catalog with reporters. This also satisfies test harnesses that fail on unasserted `console.warn`/`console.error`.

Report-only calls must stay bare expression statements (`DEV && diagnostics.X(p)` is fine) so they can be stripped. For production removal (see SKILL.md "Production builds"): if all report-only calls already have a guard, the `/*#__PURE__*/` annotations are sufficient. If not, add `nosticsStrip` to the build.

## Verify

- Tests assert only the code (`.name` or `[CODE]` in reporter output). Replace message assertions, including shared warning constants. Keep tests for guards, recovery, and error shapes.
- All original dev guards are still there, and there are no new guards.
- Report-only diagnostics are still strippable expression statements.
