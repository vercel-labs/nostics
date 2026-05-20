# [0.2.0](https://github.com/vercel-labs/nostics/compare/v0.1.0...v0.2.0) (2026-05-20)


* refactor!: callable diagnostic handles instead of .report()/.throw() ([1f3899e](https://github.com/vercel-labs/nostics/commit/1f3899ec5604068726ab406942b294920cd9ac05))


### Features

* per-code `docs` to override or opt out of `docsBase` ([#10](https://github.com/vercel-labs/nostics/issues/10)) ([b9fad30](https://github.com/vercel-labs/nostics/commit/b9fad30a67114823c320acf6ab36fa4e87ea5dc4))


### BREAKING CHANGES

* Each code returned by `defineDiagnostics()` is now a plain
callable function. The `.report()` and `.throw()` methods have been removed.

Migrate by replacing:

  ```ts
  diagnostics.MY_CODE.report({ name: 'x' })
  diagnostics.MY_CODE.throw({ name: 'x' })
  ```

With:

  ```ts
  diagnostics.MY_CODE({ name: 'x' })
  throw diagnostics.MY_CODE({ name: 'x' })
  ```

The call signature, return type (`Diagnostic`), and parameter inference are
unchanged. Prefixing the call with `throw` is now required to let TS
properly type the execution flow.

# [0.1.0](https://github.com/vercel-labs/nostics/compare/v0.0.6...v0.1.0) (2026-05-13)

This release includes major breaking changes and simplification. Check the README.md for updated docs

### Features

- pretty format ([4e1882c](https://github.com/vercel-labs/nostics/commit/4e1882c5bb41f77a4ebddf01c3f6d912315c4359))
- wire docsBase in defineDiagnostics ([4661c9f](https://github.com/vercel-labs/nostics/commit/4661c9f67ac5479cd0ee436704910a708060ed71))

## [0.0.6](https://github.com/vercel-labs/logs-sdk/compare/v0.0.5...v0.0.6) (2026-04-16)

### Features

- add debug option to server plugin ([7c2392f](https://github.com/vercel-labs/logs-sdk/commit/7c2392fb4716118fa84b469b01c7eff2c057221e))
- initialize log file and display path on dev server start ([19323e2](https://github.com/vercel-labs/logs-sdk/commit/19323e254ee0d8935e479651b08dabc902cf6641))

## [0.0.5](https://github.com/vercel-labs/logs-sdk/compare/v0.0.4...v0.0.5) (2026-04-15)

### Features

- add Node.js file reporter (`nostics/node-reporter`) ([da5c97d](https://github.com/vercel-labs/logs-sdk/commit/da5c97d766c9686e0b7319b11b9c31cdb7b633f5))

## 0.0.4 (2026-04-14)

### Features

- add build time plugin ([f89b662](https://github.com/vercel-labs/nostics/commit/f89b662cc2ef342355026b6e3171520eeda80744))
- add dev server plugin ([716e591](https://github.com/vercel-labs/nostics/commit/716e591abe0ce3e7ddc368916fa77133fd70c859))
- append logs to file ([0239f79](https://github.com/vercel-labs/nostics/commit/0239f79abcaf02a30cbf090a6f4003cb21ffb3bc))
- capture stack trace on diagnostic emission by default ([8c92972](https://github.com/vercel-labs/nostics/commit/8c929729c78c6c6730fc925e4116f255f3f59346))
- implement logs-sdk library ([a30f0b5](https://github.com/vercel-labs/nostics/commit/a30f0b5a524d9f0544465e1981e6dc200b43171a))
- support function for `docsBase` ([fb09949](https://github.com/vercel-labs/nostics/commit/fb099491fd4ccdd9d1a0dc551a3906f197f52dce))
