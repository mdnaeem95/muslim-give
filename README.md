# Muslim Give

Local-first mobile app for tracking Muslim charitable giving (sadaqah, zakat, monthly giving, Eid planning).

The single source of truth for how it is built is [`docs/technical-spec.md`](docs/technical-spec.md).
The live, commentable copy is the Claude Doc "Muslim Give — Technical Design & Implementation Specification"; this file is a snapshot. Update it when the Doc changes.

## Status

Phase 0 (foundations) not started. See spec section 21.

## Getting started (one-time, Phase 0)

Dependencies are deliberately not yet in `package.json`: spec 5.1 requires exact pins and a committed lockfile, which only a real install can produce. Run once, then commit `package.json` and `pnpm-lock.yaml`:

```sh
corepack enable
pnpm add -wD -E typescript turbo prettier eslint typescript-eslint @commitlint/cli @commitlint/config-conventional
pnpm add -D -E --filter @muslim-give/domain jest ts-jest @types/jest fast-check
pnpm install && pnpm typecheck && pnpm test
```

CI runs `pnpm install --frozen-lockfile`, so it will fail until the lockfile is committed.
