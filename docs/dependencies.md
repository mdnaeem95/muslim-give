# Dependencies

Every dependency needs an entry (spec 18.4): need, maintenance, New Architecture support, licence, vulnerabilities, privacy manifest.

| Package                                          | Where      | Why                            | Licence    |
| ------------------------------------------------ | ---------- | ------------------------------ | ---------- |
| typescript                                       | root dev   | Strict typing                  | Apache-2.0 |
| turbo                                            | root dev   | Task orchestration and caching | MIT        |
| jest, ts-jest, @types/jest                       | domain dev | Test runner (spec 5.2)         | MIT        |
| fast-check                                       | domain dev | Property tests (spec 17)       | MIT        |
| prettier                                         | root dev   | Formatting                     | MIT        |
| eslint, typescript-eslint                        | root dev   | Linting                        | MIT        |
| @commitlint/cli, @commitlint/config-conventional | root dev   | Conventional Commits (18.2)    | MIT        |

## Pinned decisions

| Decision                                              | Why                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript pinned to 5.9 (root and `packages/domain`) | 7.x is the native compiler and does not expose the JS compiler API that `ts-jest` needs; `typescript-eslint` also supports only below 6.1. Revisit when both support it. |
| Node 22 (`.nvmrc`, `engines`)                         | Matches CI; developers on newer Node should switch with a version manager.                                                                                               |
| pnpm 10 (`packageManager`)                            | Installed with `npm i -g pnpm@10` where Corepack is absent.                                                                                                              |
