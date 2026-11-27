/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts'],
  coverageReporters: ['text', 'json-summary', 'lcov'],
  // Spec phase 0 gate: domain at 100% branch coverage.
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
