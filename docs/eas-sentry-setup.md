# EAS and Sentry setup runbook (Phase 0)

What the author does, once, so the app can be built on the cloud and report crashes. The code is in `apps/mobile` (ADR 019). Local builds with `pnpm ios` keep working without any of this; reporting is simply off.

## 1. Install the two packages

```sh
pnpm --filter @muslim-give/mobile exec expo install @sentry/react-native expo-dev-client -- --save-exact
git diff apps/mobile/package.json   # versions must have no ^ or ~; remove them if they do
```

`expo install` chooses versions that match SDK 58. Commit `apps/mobile/package.json` and `pnpm-lock.yaml`, and tell Claude, who then checks the new code against the installed versions.

## 2. Expo account and project

```sh
cd apps/mobile
npx eas-cli login
npx eas-cli init
```

`eas init` creates the project on Expo. Because `app.config.ts` is code, it will say it cannot write the project ID and show it instead. Send Claude the `projectId` and the account name (the owner); they go into `app.config.ts`.

## 3. Sentry account

1. Create an account and an organisation at sentry.io. Choose the region carefully: Sentry has the US and Germany only, and the choice cannot be changed later. Tell Claude which one.
2. Create one project, platform **React Native**, named `muslim-give`. Copy its DSN (Settings, Client Keys).
3. Keep the DSN out of the repository. Store it per environment in EAS (flags may differ by version; `eas env:create --help` lists them):

```sh
npx eas-cli env:create --name EXPO_PUBLIC_SENTRY_DSN --value "<the DSN>" --environment preview --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SENTRY_DSN --value "<the DSN>" --environment production --visibility plaintext
```

For now the build profiles do not read these values; Claude will point the profiles at them once the first build works.

## 4. First builds

```sh
cd apps/mobile
npx eas-cli build --profile development-simulator --platform ios   # installs on the iOS simulator
npx eas-cli build --profile development --platform android         # an APK for the Android emulator or a phone
```

A build on a real iPhone needs the paid Apple Developer Program and a registered device (`npx eas-cli device:create`). Tell Claude if you are enrolled, or when you plan to be.

## 5. Check

- `pnpm verify` passes after step 1, with no change to the lockfile.
- Both builds finish on expo.dev and install and open on the simulator or emulator.
- Reporting stays off in these builds (no DSN is set for the `development` environment), so nothing is sent.
