# Firebase setup runbook (Phase 0)

What the author does, once, to create the three projects in Singapore and prove the rules. The rules and config are in `firebase/` (ADR 018).

## 1. Tools

```sh
brew install --cask temurin@21   # Java 21 or newer, for the emulators
java -version                    # should say 21 or higher
pnpm install                     # installs firebase-tools and the test packages
```

## 2. Prove the rules on your machine

```sh
pnpm test           # structure checks, no emulator
pnpm test:rules     # starts the emulators, runs every allow and deny path, stops them
```

The first `test:rules` downloads the emulator jars (about 100 MB), so it is slow once.

## 3. Create the projects

Project IDs are global, so one may be taken. If `firebase projects:create` says so, pick another ID and tell Claude so `.firebaserc` and spec 19.1 can be changed together.

Display names may contain only letters, numbers, spaces, hyphens, single quotes and exclamation marks. Parentheses are refused (HTTP 400, "project display name contains invalid characters").

```sh
pnpm --filter @muslim-give/firebase exec firebase login
cd firebase
npx firebase projects:create muslimgive-dev --display-name "Muslim Give Dev"
npx firebase projects:create muslimgive-staging --display-name "Muslim Give Staging"
npx firebase projects:create muslimgive-prod --display-name "Muslim Give Prod"
```

## 4. In the Firebase console, for each project (dev, staging, prod)

1. Upgrade to the **Blaze** plan (needed for Cloud Storage and Functions). Add a **budget alert** at 50%, 90% and 100% of a small monthly amount (decision D-25).
2. **Firestore Database > Create database**, location **asia-southeast1 (Singapore)**, production mode. The location cannot be changed later.
3. **Storage > Get started**, location **asia-southeast1 (Singapore)**, production mode.
4. **Authentication > Get started**, enable **Anonymous** for now. Google, Apple and email come in Phase 2.

## 5. Deploy the rules

```sh
cd firebase
npx firebase deploy --only firestore:rules,firestore:indexes,storage --project dev
```

Do the same with `--project staging` when staging is ready. Production is deployed by CI only (spec 12.1); do not deploy it by hand.

## 6. Check

- Firestore and Storage show **asia-southeast1** in their settings.
- In the console's Rules tab, the deployed rules equal `firebase/firestore.rules` and `firebase/storage.rules`.
- Tell Claude the three project IDs and that the console shows Singapore, and it will fill them into the evidence entry.
- Overwrite check, once, on the dev project (the emulator cannot test this, see ADR 018): upload a receipt, then upload to the same path again. The second upload must be refused. Claude will give you the exact steps when the app can upload receipts.
