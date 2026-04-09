# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Commands

```bash
pnpm exec vitest run                      # run all tests once
pnpm exec vitest run test/logger.test.ts  # single test file
pnpm lint --fix                           # eslint with auto-fix
pnpm build                                # build with tsdown
pnpm typecheck                            # tsc
```

## Architecture

Structured diagnostic SDK — typed, serializable `Diagnostic` objects with stable codes.

`defineDiagnostics()` → factories with param interpolation → `createLogger()` binds to formatter + reporter → chainable actions (`.warn/.error/.throw/.log/.format`) → `CodedError` when throwing.

`src/code-transform/` — build-time AST transform: marks diagnostic code as pure, wraps with `NODE_ENV` guard for tree-shaking.

Monorepo (pnpm workspaces): `playground/` and `playground-lib/` are subprojects.
