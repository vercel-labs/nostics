# [1.1.0](https://github.com/vercel-labs/nostics/compare/@nostics/unplugin@1.0.0...@nostics/unplugin@1.1.0) (2026-06-17)


### Features

* prod diagnostics at 340b only ([353700e](https://github.com/vercel-labs/nostics/commit/353700e47eda2b3fbac33df1c7bfafa63ae11751))
* **unplugin:** improve default stacktrace cleanup ([ccc847f](https://github.com/vercel-labs/nostics/commit/ccc847fc884597346a0941d58b7659b5ca45b8eb))

# [1.0.0](https://github.com/vercel-labs/nostics/compare/@nostics/unplugin@0.1.0...@nostics/unplugin@1.0.0) (2026-06-15)

Stable release 🎊

# 0.1.0 (2026-06-12)

### Code Refactoring

- extract build plugins into @nostics/unplugin ([#21](https://github.com/vercel-labs/nostics/issues/21)) ([e32d9a0](https://github.com/vercel-labs/nostics/commit/e32d9a00f822eb154ab073d4328bbe87cad6b116))

### BREAKING CHANGES

- the unplugin subpaths moved to a separate package.
  Install `@nostics/unplugin` and update imports:

* `nostics/unplugin/strip-transform` -> `@nostics/unplugin/strip-transform`
* `nostics/unplugin/dev-server-collector` -> `@nostics/unplugin/dev-server-collector`
