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
