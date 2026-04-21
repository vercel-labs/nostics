# Migration — from `throw new Error` / `console.warn` to `logs-sdk`

Mechanical recipe for converting existing error and warning sites to structured diagnostics.

## Mapping existing call sites

| Existing                                | Replace with                                        |
| --------------------------------------- | --------------------------------------------------- |
| `throw new Error(msg)`                  | `log.CODE().throw()` (level defaults to `'error'`)  |
| `throw new Error(msg, { cause })`       | `log.CODE({ ...params }, { cause }).throw()`        |
| `console.error(msg)`                    | `log.CODE().error()`                                |
| `console.warn(msg)`                     | `log.CODE().warn()` (or define with `level: 'warn'` → `.log()`) |
| `console.warn('deprecated: ...')`       | Define with `level: 'deprecation'` → `.log()`       |
| `console.info('tip: ...')`              | Define with `level: 'suggestion'` → `.log()`        |
| `console.log('...')` for user guidance  | Define appropriate level → `.log()`                 |
| Raw `console.log` for debugging         | **Not a diagnostic.** Leave it as `console.log`.    |

Reserve diagnostics for things the user/agent needs to notice or act on. Internal debugging noise doesn't belong in the code registry.

## Picking the level

- **`error`** — broken; the program can't continue or the operation produced no valid result.
- **`warn`** — a problem the caller should see but the operation continued (degraded result, fallback used).
- **`deprecation`** — the API works but will be removed. Pair with a `fix` pointing to the replacement.
- **`suggestion`** — not a problem at all; an improvement the user could make.

If you can't decide between `error` and `warn`, ask: *does the calling code still produce a usable result?* Yes → `warn`. No → `error`.

## Converting dynamic messages

Interpolated strings become parameterized templates. The function form gives you typed params, keeps interpolation at one site, and lets the test suite assert on structured fields instead of message text.

```ts
// Before
throw new Error(`Invalid plugin \`${src}\`. src option is required.`)

// After — in diagnostics.ts
NUXT_B2011: {
  message: (p: { src: string }) => `Invalid plugin \`${p.src}\`. src option is required.`,
  fix: 'Pass a string path or an object with a `src` property to `addPlugin()`.',
},

// After — at the call site
log.NUXT_B2011({ src }).throw()
```

**When a value is useful but doesn't belong in the message**, put it in `context` — machine-only metadata that reporters and agents see but formatters don't render:

```ts
log.NUXT_B2011({ src }, { context: { moduleName, resolvedFrom } }).throw()
```

## Preserving the original error

Wrap with `cause`. The `CodedError` thrown by `.throw()` mirrors it onto `Error.cause`, so existing `err.cause` consumers keep working.

```ts
// Before
try { await parse(x) } catch (err) {
  throw new Error(`Parse failed: ${err.message}`, { cause: err })
}

// After
try { await parse(x) } catch (err) {
  log.PARSE_E001({ input: x }, { cause: err }).throw()
}
```

## Incremental adoption

You don't need to convert the whole codebase at once. Three staged approaches, cheapest first:

**1. One domain at a time.** Add a new diagnostics file per domain (`build.ts`, `runtime.ts`, `config.ts`), each calling `defineDiagnostics()`. Combine them in `createLogger({ diagnostics: [...] })`. Convert call sites in that domain, leave the rest alone. No downstream break — the rest still throws regular `Error`s.

**2. Wrap at the boundary.** If a deep internal function throws `Error`, catch it at the next higher layer and re-throw via a diagnostic with `cause`. You structure the public surface without touching the internals.

```ts
try {
  return internalParse(src)
}
catch (err) {
  log.PARSE_E001({ src }, { cause: err }).throw()
}
```

**3. Keep both in parallel (rare).** If a call site is on the critical path and you're nervous about changing its behavior, call `.error()`/`.warn()` *and* keep the existing `throw`/`console` call for one release. Remove the old call once consumers have migrated their catch/assertion code. Don't leave both in long-term — pick one.

## Don't forget

- **Codes are permanent** — once shipped, never rename or reassign. If a diagnostic's meaning genuinely changes, introduce a new code and deprecate the old one.
- **Fill `fix`** whenever the resolution is known. It's the single most-valuable field for humans and agents.
- **Set `docsBase`** from day one, even before the docs pages exist. Codes will start surfacing `docs:` URLs immediately, and you can fill in the pages behind them incrementally. See `documentation-site.md`.
- **Add new codes in a PR that also adds the docs page** — the `/add-diagnostic` skill guides this workflow if installed.
