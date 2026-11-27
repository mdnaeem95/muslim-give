# ADR 012: app shell decisions

- Status: accepted
- Date: 2026-11-27

## Context

The Expo app needs a first shell: routes, five tabs, theme, clock, logging and an error boundary, with the workspace packages imported from the app. Four decisions in it differ from, or go beyond, the wording of the spec.

## Decisions

1. **Metro resolves `.js` imports to `.ts` files.** The workspace packages are TypeScript sources whose imports end in `.js`, as TypeScript's module rules require. Metro does not map them, so `apps/mobile/metro.config.js` tries the name without the extension first. The packages keep one import style for Jest, `tsc` and the app. `pnpm --filter @muslim-give/mobile bundle:check` proves it by bundling both platforms.
2. **JavaScript tab bar now, native tab bar later.** Spec 6.4 asks for a native bottom tab bar. Expo Router's native tabs are still marked unstable, so the shell uses the standard `Tabs`. Switching later changes one layout file. The five routes, their order and the accessibility labels are final.
3. **A thin translation lookup now, i18next later.** Screens call `t('key')` against `en.json`, so no string literal appears in a component. The lookup is about twenty lines of tested TypeScript. `i18next` with ICU plurals (spec 5.2) is added with the first screen that needs plurals, and call sites do not change.
4. **No database wiring yet.** Opening `expo-sqlite`, running the Drizzle migrations with the backup-and-restore step (spec 7.7), and the `SqlExecutor` adapter are the next PR, because they need a device to verify.

## Consequences

- Pure app logic lives in `apps/mobile/src/lib`, has no React or Expo import (an ESLint rule enforces it) and is tested in Node at 100%.
- Screens, providers and the error boundary are checked by typecheck, lint, the bundle check and a device run. Component tests with React Native Testing Library arrive with the first feature.
- Fonts (Noto Sans) and icons are not bundled yet; the system font is used.
