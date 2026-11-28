/** Emulator tests only. Run through `firebase emulators:exec` (see `test:rules`). */
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] },
  testMatch: ['<rootDir>/test/**/*.rules.test.ts'],
  testTimeout: 20000,
  // Both suites share one emulator, and each one reloads the rules and clears data in its set-up.
  // Run in parallel they race (a Storage upload was refused while the Firestore suite started).
  maxWorkers: 1,
};
