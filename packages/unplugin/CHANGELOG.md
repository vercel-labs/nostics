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
