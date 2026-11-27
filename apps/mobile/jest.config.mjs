/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: { jsx: 'react-native' } }] },
  testMatch: ['<rootDir>/src/lib/**/*.test.ts'],
  // Pure logic only. Screens and providers are checked by typecheck, lint and a device run until
  // React Native Testing Library is added with the first feature.
  collectCoverageFrom: ['src/lib/**/*.ts', '!src/lib/**/*.test.ts'],
  coverageReporters: ['text', 'json-summary', 'lcov'],
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
