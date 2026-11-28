/**
 * Tests that need no emulator: they read the rules files as text. `pnpm test` runs these.
 * The emulator tests (`*.rules.test.ts`) run with `pnpm test:rules`.
 */
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] },
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  testPathIgnorePatterns: ['\\.rules\\.test\\.ts$'],
};
