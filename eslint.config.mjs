import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/** Spec 18.1: strict-type-checked, zero warnings. Layer rules from spec 6 grow with the app. */
export default defineConfig(
  {
    ignores: [
      '**/coverage/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      'packages/local-db/src/migrations.generated.ts',
    ],
  },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-console': 'error', // logging only through observability/logger (18.1)
      eqeqeq: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Use the clock provider; dates are civil-date strings (spec 7.2, 18.3).',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Use the clock provider (spec 7.2, 18.3).',
        },
      ],
    },
  },
  {
    // The pure domain layer must not depend on UI, platform or backend packages (spec 6).
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                'expo',
                'expo-*',
                'firebase',
                'firebase/*',
                '@react-native-firebase/*',
                'drizzle-orm',
                'drizzle-orm/*',
              ],
              message: 'packages/domain is pure: no UI, platform or backend imports.',
            },
          ],
        },
      ],
    },
  },
  {
    // The one place allowed to touch Date: UTC epoch-day arithmetic, no time zones.
    files: ['packages/domain/src/dates/civil-date.ts', 'packages/domain/src/dates/instant.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Build-time generator and the ICU oracle test legitimately use Date to talk to Intl.
    files: ['packages/domain/scripts/**', '**/*.oracle.test.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Plain JavaScript config files: no type information, and CommonJS is what Expo expects.
    files: ['**/*.mjs', '**/*.cjs', 'apps/mobile/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // The app's pure logic stays free of React Native and Expo so it is tested in Node.
    files: ['apps/mobile/src/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'expo', 'expo-*', '@react-native/*'],
              message: 'apps/mobile/src/lib is pure: no React, React Native or Expo imports.',
            },
          ],
        },
      ],
    },
  },
  {
    // The one place that reads the system clock (spec 6.2, 7.2).
    files: ['apps/mobile/src/platform/system-clock.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // The development log sink prints already-redacted records.
    files: ['apps/mobile/src/observability/console-sink.ts'],
    rules: { 'no-console': 'off' },
  },
);
