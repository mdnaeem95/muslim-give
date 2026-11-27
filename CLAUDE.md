# Working agreements for AI-assisted changes

These rules apply to every pull request prepared with Claude. They exist because PR #7 needed five CI rounds, each fixing only the last error shown.

## Before pushing

1. Run every gate that can run in the working environment: `prettier --check`, `tsc`, the tests with coverage. Fix everything found in one commit.
2. Read the Jest coverage threshold (100% for every package) before writing tests, and check coverage for the new files before pushing, not after CI fails.
3. Before writing code, list the lint rules in `eslint.config.mjs` that new code is likely to hit (strictTypeChecked, `no-confusing-void-expression`, `dot-notation`, `no-unnecessary-condition`, `restrict-template-expressions`, unused variables), and write to them.
4. When CI fails, read the whole log and look for the same class of mistake across all new files before pushing a fix. One fix commit per round, never one per error.
5. Jest counts branches that Node's coverage does not: destructuring defaults (`[a = 0]`), `??`, `?.` and `||` fallbacks. Avoid fallbacks that cannot happen; if one is needed, test both sides.
6. Type every generic collection (`new Map<string, Row>()`, `new Set<string>()`, `[] as Row[]`); an untyped one is `any` and fails `no-unsafe-*`.
7. Code that the real library runs lazily (Drizzle constraint and foreign-key callbacks, for example) must be exercised by a test. Stand-ins used for local checking do not prove this.

## What cannot be checked locally

ESLint with typescript-eslint, and the real types of packages that could not be installed, cannot run in the sandbox. Say so in the PR description, list the lint rules most likely to fire, and ask the author to run `pnpm verify` before CI where it matters.

## Pull requests

- One PR per coherent change, with the evidence entry in `docs/evidence/phase-0.md` (or the current phase file) added in the same PR.
- The PR description lists the author's manual steps (installs, generated files) as commands.
- Only format new files with the sandbox Prettier; never reformat existing files with it.
- `pnpm verify` runs all CI gates locally: format check, typecheck, lint, test.
