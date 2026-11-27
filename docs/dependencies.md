# Dependencies

Every dependency needs an entry (spec 18.4): need, maintenance, New Architecture support, licence, vulnerabilities, privacy manifest.

| Package                                                                   | Where        | Why                                                         | Licence    |
| ------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------- | ---------- |
| typescript                                                                | root dev     | Strict typing                                               | Apache-2.0 |
| turbo                                                                     | root dev     | Task orchestration and caching                              | MIT        |
| jest, ts-jest, @types/jest                                                | domain dev   | Test runner (spec 5.2)                                      | MIT        |
| drizzle-orm                                                               | local-db     | Typed SQLite schema and queries (spec 5.2)                  | Apache-2.0 |
| drizzle-kit                                                               | local-db dev | Generates SQL migrations (spec 7.7)                         | Apache-2.0 |
| @types/node                                                               | local-db dev | Types for `node:sqlite` in tests                            | MIT        |
| expo, expo-router, expo-status-bar, expo-linking, expo-constants          | mobile       | App framework and file-based navigation (spec 5.2, ADR 001) | MIT        |
| react, react-native, react-native-screens, react-native-safe-area-context | mobile       | UI runtime; New Architecture only                           | MIT        |
| expo-sqlite                                                               | mobile       | Local database on the device (spec 7.7, ADR 013)            | MIT        |
| @types/react, @types/node                                                 | mobile dev   | Types for components and `app.config.ts`                    | MIT        |
| fast-check                                                                | domain dev   | Property tests (spec 17)                                    | MIT        |
| prettier                                                                  | root dev     | Formatting                                                  | MIT        |
| eslint, typescript-eslint                                                 | root dev     | Linting                                                     | MIT        |
| @commitlint/cli, @commitlint/config-conventional                          | root dev     | Conventional Commits (18.2)                                 | MIT        |

## Pinned decisions

| Decision                                              | Why                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript pinned to 5.9 (root and `packages/domain`) | 7.x is the native compiler and does not expose the JS compiler API that `ts-jest` needs; `typescript-eslint` also supports only below 6.1. Revisit when both support it. |
| Node 22 (`.nvmrc`, `engines`)                         | Matches CI; developers on newer Node should switch with a version manager.                                                                                               |
| pnpm 10 (`packageManager`)                            | Installed with `npm i -g pnpm@10` where Corepack is absent.                                                                                                              |
