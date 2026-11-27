# Muslim Give — Technical Design & Implementation Specification

Nov 27, 2026 · @Muhammad Naeem Bin Sani

## 1. Document control

This document is the single source of truth for **how** Muslim Give is built. The product brief and prototype remain the source of truth for **what** it does and **what it says**. Where they disagree, the rules in section 1.2 decide.

### 1.1 Status and ownership

| Item | Value |
| --- | --- |
| Version | 1.0 (first full draft) |
| Product owner | Isa Othman — owns product rules, wording and the decisions in section 22 |
| Technical owner | Lead developer (to be named) — owns architecture, this document and its ADRs |
| Inputs | Muslim\_Give\_Developer\_Handover (24 Nov 2026), Muslim\_Give\_SignUp\_Spec.md, Muslim\_Give\_Donation\_Tracker.html (prototype) |
| Review cycle | Re-read at the start of each delivery phase; update whenever an ADR is accepted |

### 1.2 Order of precedence

When two sources conflict, the higher one wins and the lower one is corrected.

1. A signed-off product decision recorded by Isa (section 22, or a dated ADR).
2. **Rules and edge cases** in the Developer Handover ("please don't change them without asking Isa").
3. The Guest Mode & Sign-Up Spec.
4. This document (technical design, data model, standards).
5. The prototype, for screens, wording and behaviour not covered above.

The prototype is a behavioural reference, not code to ship. Its logic is ported into tested TypeScript modules (Appendix A maps each prototype function to its new home). Its storage, auth and file handling are replaced entirely.

### 1.3 How this document changes

- **Architecture Decision Records (ADRs).** Any change to a decision in sections 4–9 or 12–15 needs an ADR in `docs/adr/NNNN-title.md` (context, options, decision, consequences). Accepted ADRs are reflected here in the same pull request.
- **Product rule changes** need Isa's written approval, linked from the ADR or the pull request.
- **Normative words.** MUST / MUST NOT = required for release. SHOULD = expected unless an ADR explains why not. MAY = optional.
- The repository keeps a copy of this document as `docs/TECHNICAL_SPEC.md`, exported at each version bump, so code reviews can cite section numbers.

## 2. Product summary, scope and non-goals

Muslim Give is a private, personal log of donations a Muslim has **already made**, to people, mosques and charities, in Singapore or overseas. It ships on iPhone and Android from one codebase. Launch market is Singapore (S$ default, MUIS references, Singapore mosque and charity lists).

### 2.1 In scope (v1.0, phases 1–4)

| ID | Capability | Summary |
| --- | --- | --- |
| F-01 | Guest mode | App opens straight to the Dashboard. No sign-up, no login screen. |
| F-02 | Welcome card | Name and Single/Married, both skippable; shown once. |
| F-03 | Log Donation | Home or overseas, amount, recipient (Individual / Mosque / Charity), occasion, type of giving, on behalf of, date, note, receipts. |
| F-04 | Dashboard | Greeting with Islamic date, special-day card, coming-up line, dates to remember, Friday card, monthly-giving confirmations, month vs budget, year and all-time KPIs, overseas card, charts, filtered history. |
| F-05 | Budget | Monthly budget, meter and warnings, committed monthly giving, "How much should I give?" calculator (never stored). |
| F-06 | Monthly giving | Recurring rules with auto or confirm mode, pause, resume, stop, change amount, one-time back-fill offer. |
| F-07 | Yearly reminders | Same calendar date each year; 7 days ahead and on the day. |
| F-08 | Friday reminder | Off by default; hides once something is logged that day or it is dismissed. |
| F-09 | Islamic dates | Official date per home country, else Umm al-Qura calculation plus user adjustment of −1 / 0 / +1. |
| F-10 | Eid Planner | Per-person plan and "people I may meet" packets (kids, elderly); ticks are real log entries; separate Eid budget. |
| F-11 | Receipts | Photos, PDFs, emails attached to donations; private cloud storage per user. |
| F-12 | Accounts | "Create free account" prompt after the 5th entry; Google, Apple or email linked to the same guest account. |
| F-13 | Profile | Name, status, country, currency, Islamic date adjustment, reminders, account status. |
| F-14 | Export my data | CSV of donations (plus receipts, see 10.13). |
| F-15 | Delete my account & data | In-app, complete, including receipts and the sign-in record. |
| F-16 | Server-managed lists | Mosques, charities, Saudi symbolic mosques, official Islamic dates, updatable without an app release. |

### 2.2 Non-goals (hard boundaries)

These MUST NOT be added without a product decision, because each one changes the app's legal or trust position.

- The app **never receives, holds, sends or initiates money**. No payment SDKs, no bank links, no donation buttons that pay.
- **No currency conversion**, ever. Overseas gifts stay in their own currency and are totalled per currency.
- **No tax-deductibility checks.** Receipts are files the user keeps.
- **Nothing that reveals salary.** No MBMF, no stored income. The income calculator is screen-only.
- **No family linking** in v1.0 (the prototype's hidden "My family" tab and its `share/` documents are not built). The data model leaves no hooks for it; see section 22.
- No social features, no public profiles, no ads, no third-party advertising or attribution SDKs.
- No web app in v1.0. An admin console for reference data is in scope (section 12.6); it is internal only.

### 2.3 Glossary

| Term | Meaning in this document |
| --- | --- |
| Entry / donation | One logged gift. Eid Planner ticks and monthly-giving occurrences are also entries. |
| Home country / home currency | From Profile. Decides what is "overseas" and which currency counts towards totals and budget. |
| Overseas entry | An entry whose country differs from the current home country. Derived, never stored as a flag. |
| Guest | A user whose only identity is an anonymous Firebase account (or, before first network contact, no cloud identity at all). |
| Linked account | A guest account that has had Google, Apple or email credentials attached to the same user ID. |
| Rule | A monthly-giving definition. An **occurrence** is one month of a rule. |
| Hijri / Islamic date | Date in the Islamic lunar calendar. Months use the Malay spellings in the prototype (e.g. Syawal, Zulhijjah). |
| Official date | An Islamic date announced by a country's authority (MUIS for Singapore), entered on the server. |
| Reference data | Server-managed lists: mosques, charities, countries, currencies, official dates. |
| Outbox | The local queue of changes waiting to be uploaded. |
| ADR | Architecture Decision Record. |

## 3. Engineering principles and non-functional requirements

The app is **local-first**: every screen reads from an on-device database, works with no network, and the cloud is a replica the device syncs to. Everything else in this document follows from that and from the eight principles below.

### 3.1 Principles

1. **The user's records are sacred.** No code path may silently lose, duplicate or alter a past entry. Every write is idempotent, every delete is explicit, every migration is reversible or backed up first.
2. **Never block the user.** No network call sits between a tap and its result. Sign-up is never required. Errors degrade to "saved on this phone", never to a dead end.
3. **Rules live in one place.** All business rules (budget, totals, recurring, reminders, Islamic dates, Eid sync) are pure TypeScript functions in `packages/domain`, with no React, database or platform imports, and 100% branch coverage.
4. **Privacy by default.** Collect the minimum, process in Singapore where possible, never log amounts, names or notes to analytics or crash reports.
5. **Native feel on each platform.** Shared logic, platform-appropriate UI behaviour (navigation, back, sheets, pickers, notifications). Section 15 is binding.
6. **Accessible by default.** WCAG 2.2 AA equivalent, screen readers, dynamic type to 200%, 44×44 pt / 48×48 dp touch targets.
7. **Boring, well-supported technology.** Prefer first-party and widely used libraries with active maintenance. Every dependency is justified in `docs/dependencies.md`.
8. **Everything is automated.** Lint, type-check, tests, security scans, builds and store submission run in CI. Nothing reaches users without passing the pipeline.

### 3.2 Measurable targets

These are release gates: phase exit (section 21) requires each one measured and met.

| Area | Requirement | Target | How measured |
| --- | --- | --- | --- |
| Startup | Cold start to interactive Dashboard, reference low-end Android | ≤ 2.0 s (p75) | Firebase Performance / Sentry trace, release build |
| Startup | Cold start, iPhone reference device | ≤ 1.2 s (p75) | Same |
| Responsiveness | "Save donation" tap to toast | ≤ 150 ms, no network dependency | Instrumented trace |
| Scrolling | History list with 5,000 entries | ≥ 55 fps on reference low-end Android, no blank cells | Perf monitor, Maestro perf flow |
| Dashboard | Recompute all totals and charts for 5,000 entries | ≤ 100 ms on reference low-end Android | Benchmark test in CI on device farm |
| Offline | Every feature except account creation, sign-in and receipt upload | Fully usable offline | E2E airplane-mode suite |
| Durability | Entries lost or duplicated by sync, recurring or Eid logic | Zero | Property-based tests + sync chaos tests |
| Sync | Change visible on a second signed-in device | ≤ 10 s when both online (p95) | Staging synthetic test |
| Stability | Crash-free sessions | ≥ 99.7% | Crashlytics / Sentry |
| Stability | ANR rate (Android) | < 0.47% user-perceived (below Play's bad-behaviour threshold) | Play Console vitals |
| Size | Install size | ≤ 40 MB Android (per-ABI), ≤ 60 MB iOS | Store reports |
| Battery | Background work | No more than one background task window per day; no persistent services | Platform battery tools |
| Accessibility | Automated + manual audit | Zero blocker issues; all flows usable with VoiceOver and TalkBack | Checklist in section 17 |
| Security | OWASP MASVS v2 L1 controls, plus selected L2 (section 13) | All applicable controls pass | Pre-release MASTG review |
| Backend | Cloud Function error rate | < 0.5% of invocations | Cloud Monitoring alert |
| Recovery | Firestore point-in-time recovery window | 7 days PITR + daily exports kept 35 days | Ops runbook check |

Reference devices are listed in section 16.1. A target may only be relaxed by ADR.

## 4. System architecture

The phone holds the complete record set in SQLite and works without the cloud. Firebase is a private, per-user replica that lets records survive a lost phone and appear on a second device.

&#91;embedded content: System architecture · device layers and Firebase services\]

Screens never talk to Firebase directly: they read the local database and call domain functions; only the sync engine and file uploader cross the network.

### 4.1 Responsibilities

| Component | Owns | Never does |
| --- | --- | --- |
| Screens | Rendering, input, navigation, accessibility | Business rules, direct database writes, network calls |
| Domain | Every rule in section 10, as pure functions with typed inputs and outputs | I/O of any kind, reading the clock (the current date is passed in) |
| Repositories (data layer) | Transactions, mapping rows to domain types, writing the outbox | Rule decisions |
| Local database | The user's full record set, reference data cache, sync metadata | Storing secrets or tokens |
| Sync engine | Pushing the outbox, pulling remote changes, conflict resolution | Running when there is no signed-in Firebase user |
| Receipt store | Compression, EXIF removal, local files, upload and download queue | Rendering arbitrary file types in-app |
| Platform services | Local notification schedule, daily background task, secure storage | Holding state that is not rebuildable from the database |
| Firebase Auth | Anonymous and linked identities | Storing any profile data beyond provider defaults |
| Firestore | Replica of the user's records; reference data; official Islamic dates | Being read by screens |
| Cloud Storage | Receipt files, one folder per user | Serving files to anyone but the owner |
| Cloud Functions | Account deletion, guest merge, reference publishing, push fan-out, scheduled exports | Reading or analysing donation content for any other purpose |
| Admin console | Entering official dates and list updates, with review | Accessing any user's data |

### 4.2 Key flows in one line each

- **Log a donation:** form → domain validation → repository writes the donation row and an outbox row in one SQLite transaction → live query updates every screen → sync pushes when online.
- **First open, offline:** app creates a local install ID and works; anonymous sign-in is retried with back-off; sync starts the moment a Firebase user exists.
- **Create free account:** native provider sheet → credential → `linkWithCredential` on the current anonymous user → same user ID, nothing moves.
- **Official Eid date announced:** admin enters it → function publishes it and sends a silent push → devices refresh the date table and reschedule notifications.

## 5. Technology stack and key decisions

The app is built with **React Native on Expo (TypeScript, New Architecture only)**, a **local SQLite database** as the on-device source of truth, and **Firebase in the Singapore region** as the cloud replica. Each choice below has an ADR in the repository.

### 5.1 Version policy

- Start on the latest stable Expo SDK at project kick-off. At the time of writing that is [Expo SDK 58](https://expo.dev/changelog/sdk-58), released 15 Oct 2026 with React Native 0.88. Upgrade to each new SDK within 8 weeks of its release, on a branch, behind the full E2E suite.
- Pin exact versions in `package.json` (no `^` or `~`) and commit the lockfile. Renovate opens grouped weekly PRs; security patches are merged within 7 days.
- Android `targetSdkVersion` MUST meet Google Play's current rule: [new apps and updates must target Android 16 (API 36)](https://developer.android.com/google/play/requirements/target-sdk) from 31 Aug 2026. Re-check every July, because the bar rises yearly.
- iOS builds use the Xcode version required by App Store Connect at submission time (EAS image pinned per release branch).
- Node.js LTS for tooling and Cloud Functions; the exact major is pinned in `.nvmrc` and `functions/package.json` `engines`.

### 5.2 Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript, `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | No `any` without a lint-disable comment that explains why |
| App framework | Expo (development builds, Continuous Native Generation) | No Expo Go; native config only via config plugins, `ios/` and `android/` are generated, not committed |
| JS engine | Hermes | Default; required for startup targets |
| Navigation | Expo Router: native stack + native bottom tabs | Platform-native transitions, back behaviour and tab bars |
| Local database | `expo-sqlite` with Drizzle ORM and Drizzle migrations | WAL mode, foreign keys on, live queries for reactive screens |
| UI state | Zustand (ephemeral UI only) | Persisted data is never held in a global store; it is read from SQLite |
| Forms and validation | react-hook-form + zod | The same zod schemas validate imports, sync payloads and Cloud Function inputs (`packages/schema`) |
| Lists | `@shopify/flash-list` | History can run to thousands of rows |
| Charts | In-house components on `react-native-svg` | The prototype's charts are simple bars and columns; a chart library adds weight and weakens accessibility |
| Animation | `react-native-reanimated` | Only where it aids understanding (meters, sheets) |
| Dates | ISO civil-date strings + `date-fns` for arithmetic | No `Date` objects in the domain layer (section 7.2) |
| Islamic calendar | In-house Umm al-Qura table module in `packages/domain` | Verified against ICU in CI (ADR-007) |
| Money | In-house `Money` type on integer minor units with ISO 4217 exponents | Formatting via `Intl.NumberFormat` plus the prototype's symbol map |
| i18n | i18next + ICU message format, `expo-localization` | English at launch; every string in resource files from day one (Malay is the likely second language) |
| Firebase | `@react-native-firebase` (app, auth, firestore, storage, functions, messaging, app-check, remote-config, perf) | Native SDKs; Firestore offline persistence turned **off** because SQLite is the source of truth |
| Google sign-in | `@react-native-google-signin/google-signin` | Uses Credential Manager on Android, Google Sign-In SDK on iOS |
| Apple sign-in | `expo-apple-authentication` on iOS; Firebase OAuth provider flow on Android | Section 9.4 |
| Notifications | `expo-notifications` (local schedule, permissions); RN Firebase Messaging (silent data push) | Section 11 |
| Background work | `expo-background-task` | BGTaskScheduler on iOS, WorkManager on Android |
| Files | `expo-image-picker`, `expo-document-picker`, `expo-image-manipulator`, `expo-file-system`, `expo-sharing` | Section 10.11 |
| Secure storage | `expo-secure-store` | Keychain / Android Keystore-backed |
| Crash and performance | Sentry React Native SDK, PII scrubbing on (section 20) | Firebase Crashlytics is the fallback if a single vendor is preferred (section 22) |
| Backend runtime | Cloud Functions for Firebase (2nd gen), TypeScript, region `asia-southeast1` |  |
| Admin console | Small React web app on Firebase Hosting, staff sign-in with custom claims | Section 12.6 |
| Monorepo | pnpm workspaces + Turborepo | `apps/mobile`, `apps/admin`, `functions`, `packages/domain`, `packages/schema`, `packages/ui-tokens`, `packages/test-fixtures` |
| CI/CD | GitHub Actions + EAS Build, Submit and Update | Section 19 |
| Tests | Jest, React Native Testing Library, fast-check, Maestro, Firebase Emulator Suite | Section 17 |

### 5.3 Architecture decision records

| ADR | Decision | Why | Alternatives rejected |
| --- | --- | --- | --- |
| 001 | React Native + Expo | One codebase, native UI, and the prototype's JavaScript rules port directly into TypeScript; Expo removes most native build toil | Flutter (rewrite every rule in Dart); two native apps (double cost) |
| 002 | Local-first: SQLite is the source of truth on the device | Anonymous sign-in needs a network round trip, so a first open offline would have nowhere to save under a Firestore-only design. SQLite also gives fast aggregate queries, transactions across tables (Eid tick + log entry) and testable data access | Firestore offline cache as the only store; WatermelonDB (less active) |
| 003 | Firebase as the backend | Mature anonymous auth with account linking, native SDKs, App Check, Messaging and a Singapore region for Firestore, Storage and Functions | Supabase (anonymous sign-in and identity linking exist, but sync and push need more assembly); custom backend (cost and ops) |
| 004 | In-house sync engine (outbox + cursor pull, last-writer-wins per record) | A single person's personal log has very few real conflicts; a small, fully tested engine avoids a paid sync vendor and lock-in | PowerSync or similar (another processor of personal data, another bill) |
| 005 | Reminders are local notifications; remote push is used only to tell devices data changed | Reminders are computable on the device and must fire offline; no server needs to know birthdays | Server-scheduled push (needs server-side copies of reminder dates and adds failure points) |
| 006 | Money as integer minor units with its currency | Floating point drifts (0.1 + 0.2); currencies differ in decimals (JPY 0, KWD 3) | JS numbers as in the prototype |
| 007 | In-house Umm al-Qura table instead of `Intl` with `islamic-umalqura` | Hermes on Android builds Intl on platform Java APIs and documents gaps versus browsers, so calendar support cannot be relied on across devices; a table gives identical results on every phone and is testable | Relying on `Intl` (prototype); native modules per platform |
| 008 | Firestore persistence off; Firestore is a remote only | Avoids two local copies that can disagree, halves storage, keeps one sync path | Dual cache |
| 009 | No analytics or ads SDKs except an approved, minimal event list | Religious-giving data is sensitive; fewer processors means fewer disclosures and less risk | Full product analytics suites |

## 6. Client app architecture

The app has four layers with one-way dependencies (UI → features → data → domain), enforced by lint rules so that business rules cannot leak into screens.

### 6.1 Repository layout

```text
muslim-give/
  apps/
    mobile/                 Expo app
      app/                  Expo Router routes (thin: compose feature screens)
        (tabs)/             dashboard, log, eid, budget, profile
        modals/             welcome, account, receipts, backfill, merge
      src/
        features/           one folder per feature (see 6.2)
        data/               db/ (schema, migrations, client), repositories/, sync/, files/
        platform/           notifications/, background/, secure-store/, auth-providers/
        ui/                 design system components, theme, icons
        i18n/               en.json (+ future ms.json), formatters
        observability/      logger (redacting), sentry, perf traces
    admin/                  internal web console (section 12.6)
  functions/                Cloud Functions (TypeScript)
  packages/
    domain/                 pure rules: money, dates, hijri, budget, totals, recurring,
                            reminders, eid, account-prompt, country-change, export
    schema/                 zod schemas + generated types shared by app, functions, admin
    ui-tokens/              colours, spacing, type scale (from the prototype CSS)
    test-fixtures/          builders and seeded datasets (5, 15, 500, 5,000 entries)
  firebase/                 firestore.rules, storage.rules, indexes, emulator config
  docs/                     TECHNICAL_SPEC.md, adr/, runbooks/, dependencies.md
  .github/workflows/        CI pipelines
```

### 6.2 Feature module shape

Each feature (`dashboard`, `log-donation`, `eid-planner`, `budget`, `profile`, `monthly-giving`, `reminders`, `receipts`, `account`, `export`, `islamic-dates`) has the same internal shape:

| Folder | Contents | May import |
| --- | --- | --- |
| `screens/` | Screen components used by routes | `components/`, `hooks/`, `ui/`, `i18n/` |
| `components/` | Feature-specific presentational components | `ui/`, `i18n/` |
| `hooks/` | `useXxx` hooks that run live queries and call commands | `data/repositories`, `packages/domain` |
| `commands/` | Write operations (e.g. `saveDonation`, `tickEidPerson`) | `data/repositories`, `packages/domain` |
| `__tests__/` | Component and hook tests | anything |

Rules, enforced by `eslint-plugin-boundaries` and `dependency-cruiser` in CI:

- `packages/domain` imports nothing outside itself except `packages/schema`.
- Features never import other features' internals; shared logic moves to `domain` or `ui`.
- Only `data/sync` and `data/files` import Firebase Firestore or Storage. Only `features/account` and `platform/auth-providers` import Firebase Auth.
- No component reads the system clock. A `Clock` provider supplies `today` (civil date in the device time zone) so tests and screenshots are deterministic.

### 6.3 Reading and writing data

- **Reads:** hooks use Drizzle live queries, so a write anywhere re-renders every screen that shows it. Heavy aggregates (dashboard) are computed by domain functions over query results and memoised by input identity.
- **Writes:** a command validates input with zod, applies domain rules, then calls a repository method that performs all row changes **and** the matching outbox rows in one SQLite transaction. No partial states are possible.
- **Errors:** domain and repository functions return `Result<T, AppError>`; they do not throw for expected failures. `AppError` has a stable `code` mapped to plain-language copy in i18n. Unexpected exceptions go to an error boundary per tab that shows "Something went wrong. Your records are safe." with a retry.

### 6.4 Navigation

The prototype's five top tabs become a native bottom tab bar, in this order: **Dashboard, Log, Eid, Budget, Profile** (labels may be shortened for small screens; full names are the accessibility labels).

| Route | Presentation | Notes |
| --- | --- | --- |
| `/(tabs)/dashboard` | Tab | Default route on every cold start |
| `/(tabs)/log` | Tab | Accepts presets: `?occasion=`, `?reminderId=`, `?repeatOf=` |
| `/(tabs)/eid`, `/(tabs)/budget`, `/(tabs)/profile` | Tab |  |
| `/modals/welcome` | Full-screen modal, first open only | Not dismissible by swipe; has "Skip for now" |
| `/modals/account` | Sheet (iOS form sheet; Android modal bottom sheet) | Steps: ask → choose → email → done |
| `/modals/merge` | Full-screen modal | Section 9.5; cannot be dismissed without a choice or "Cancel" |
| `/modals/receipts/[donationId]` | Sheet | Viewer, add, remove |
| `/modals/backfill/[ruleId]` | Alert-style dialog | Native alert on both platforms |
| `/history` | Push from Dashboard | Full filterable history (the prototype shows it inline; on phones it gets its own screen) |
| `/donation/[id]` | Push | Detail and edit (the prototype has delete only; edit is added, see 10.1) |

Deep links (`muslimgive://` and verified universal / app links on the production domain) map 1:1 to these routes. Notification taps open the matching route with presets. Unknown links open the Dashboard.

### 6.5 Design system

- **Tokens** come straight from the prototype CSS: green `#00893D`, dark green `#006E31`, light green `#E5F3EB`, ink `#1E2328`, anthracite `#3C4146`, grey `#646E78`, line `#D7DCE1`, background `#F2F4F5`, warning red `#C8102E`, amber `#E6A000` and their light tints. They live in `packages/ui-tokens` and nowhere else.
- **Type:** Noto Sans (400/500/600/700), bundled with the app (not loaded from Google Fonts), scaled with the OS text size setting. Type scale: 26 / 20 / 17 / 15 / 13 / 12.
- **Shape:** square corners and 1 px rules, as in the prototype. Native controls (switches, date pickers, alerts, sheets) keep their platform look.
- **Components** (in `ui/`): Card, AccentCard, KPI, Meter (ok / near / done / over), Alert (near / over / done), Chip and ChipGroup, Segmented control, MoneyInput (currency prefix measured, as `fixMoney` does), SearchableCountryPicker, Tag, Toast, EmptyState, ListRow, BarChart (horizontal), ColumnChart (12 months), ConfirmButton (the prototype's "tap again to delete" becomes a native confirmation dialog).
- **Colour is never the only signal:** the budget meter also shows a percentage and an icon, and over-budget text says "over".
- **Dark mode:** tokens are defined for light and dark; launch ships light only unless section 22 decides otherwise. All contrast pairs are checked by a unit test against WCAG AA (4.5:1 for body text).

### 6.6 Accessibility

- Every interactive element has an accessibility role, label and, where useful, hint. Amount chips are read out as "10 Singapore dollars", not symbol by symbol.
- Dynamic type up to 200% without truncating amounts; long labels wrap. Layouts are tested at the largest setting on both platforms.
- Touch targets at least 44×44 pt (iOS) and 48×48 dp (Android).
- Charts expose a text alternative ("Mosque, 320 Singapore dollars, 40% of the year") and a "View as list" toggle.
- Toasts are announced to screen readers and also appear in context (e.g. the saved row), because toasts alone are easy to miss.
- Reduce Motion is respected (no animated meters).
- Right-to-left layout is not needed at launch, but styles use `start` / `end` rather than `left` / `right` so Arabic or Urdu can be added later.

### 6.7 Internationalisation and formatting

- All copy lives in `i18n/en.json` with ICU plurals ("You've logged {count, plural, one {# donation} other {# donations}}"). No string literals in components (lint rule).
- Approved product wording (Appendix B) is copied verbatim; changes need Isa's sign-off.
- Dates format with the `en-SG` locale as in the prototype ("5 Mar 2027"). Amounts use the prototype's symbol map (`S$`, `RM`, `Rp`, `B$`, `US$`, `£`, `€`), otherwise the ISO code and a space (for example `SAR 50`).

## 7. Data model

Every record stores its own country and currency explicitly, money is stored as integer minor units, and "overseas" is derived at read time. This removes the prototype's blank-means-home convention and the record rewriting it needed on a country change.

### 7.1 Money

- `amount_minor INTEGER NOT NULL CHECK (amount_minor > 0)` plus `currency TEXT NOT NULL` (ISO 4217 alphabetic code). Example: S$12.50 is `1250` + `SGD`; Rp 50,000 is `50000` + `IDR`; KWD 1.250 is `1250` + `KWD`.
- The number of decimals per currency comes from a table in `packages/domain/money/iso4217.ts`, generated from CLDR and checked in. Input is rejected if it has more decimals than the currency allows.
- Sums only ever add amounts **of the same currency**. The type system enforces it: `sum(a: Money<'SGD'>[]): Money<'SGD'>`; mixing throws in tests.
- Upper sanity bound: an amount above 1,000,000 major units asks "Is this amount right?" before saving (typing errors, not a limit).
- No floats anywhere in domain or storage. Formatting converts at the last moment.

### 7.2 Dates and time

| Kind | Format | Used for | Rule |
| --- | --- | --- | --- |
| Civil date | `YYYY-MM-DD` text | Donation date, reminder anchor, Eid dates | The date the user means, in their own time zone. Never converted between zones. |
| Month key | `YYYY-MM` | Budget month, recurring occurrence month | Derived from civil dates |
| Month-day | `MM-DD` | Yearly reminders | `02-29` falls on `02-28` in non-leap years |
| Instant | ISO 8601 UTC with ms, e.g. `2026-11-27T05:00:00.123Z` | `created_at`, `updated_at`, prompt timestamps | For audit and ordering only, never shown as a donation date |
| Hybrid logical clock (HLC) | `<ms>-<counter>-<deviceId>` text, sortable | Conflict resolution (section 8) | Monotonic per device even if the wall clock jumps |

"Today" is computed once per app foreground and at local midnight, in the device's current time zone, and passed into every domain function. A user who travels sees "today" follow their phone, as in the prototype.

### 7.3 Identifiers

- Random IDs are **UUIDv7** generated on the device (time-ordered, no coordination needed, safe offline).
- **Deterministic IDs** are used wherever the same fact could be created twice on two devices or two runs. Because the same fact always produces the same ID, duplicates collapse into one record:
  - Monthly-giving occurrence: `occ_<ruleId>_<YYYY-MM>`; its donation: `don_occ_<ruleId>_<YYYY-MM>`.
  - Eid Planner person gift: `don_eid_<personId>` (re-ticking after an untick revives the same record).
  - Singletons: `profile`, `budget`, `prompt_state`.
- Reference items (mosques, charities) have stable server IDs such as `sg-mosque-sultan`. A donation stores the ID **and** a snapshot of the name at the time, so renaming a list entry never rewrites history.

### 7.4 Stable codes instead of labels

The prototype stores display text ("Uncle (maternal)", "Eid al-Fitr") and then needs `migrate()` to rename things. The real app stores codes and renders labels through i18n:

| Field | Example codes |
| --- | --- |
| `category` | `individual`, `mosque`, `charity` |
| `relationship` | `father`, `mother`, `both_parents`, `spouse`, `kids`, `siblings`, `grandparents`, `uncle`, `aunt`, `cousins`, `nephew`, `niece`, `distant_relative`, `friends`, `stranger` |
| `relationship_side` / `relationship_line` | `mine`, `spouse` / `paternal`, `maternal` (rules in 10.1) |
| `occasion` | `newborn`, `cukur_rambut`, `visiting_sick`, `death_funeral`, `birthday`, `anniversary`, `wedding`, `umrah_haj_send_off`, `doa_selamat`, `doa_tahlil`, `friday_prayer`, `subuh` … `eid_prayer`, `ramadan`, `laylatul_qadr`, `eid_al_fitr`, `day_of_arafah`, `eid_al_adha`, `awal_muharram`, `ashura`, `mawlid_nabi`, `isra_miraj`, `nisfu_syaban`, `none`, `appeal_emergency`, `other` |
| `giving_type` | `sadaqah`, `zakat_fitrah`, `zakat_harta`, `infaq`, `wakaf`, `fidyah`, `eid_money`, `hadiah`, `other` |
| `on_behalf` | `self`, `late_father`, `late_mother`, `late_parents`, `other` (+ name) |
| `source` | `manual`, `recurring`, `eid_person`, `eid_packet`, `repeat_friday`, `reminder` |

### 7.5 Local database (SQLite) schema

Every synced table carries the same sync columns: `id TEXT PRIMARY KEY`, `created_at TEXT`, `updated_at TEXT`, `hlc TEXT NOT NULL`, `deleted INTEGER NOT NULL DEFAULT 0` (tombstone). Deleted rows are hidden by every query and purged 90 days after they have synced.

**`donations`**

| Column | Type | Constraint / meaning |
| --- | --- | --- |
| `date` | TEXT | Civil date, not in the future (domain check) |
| `amount_minor`, `currency` | INTEGER, TEXT | Section 7.1 |
| `country_code` | TEXT | ISO 3166-1 alpha-2 where the gift was made. Always set. |
| `category` | TEXT | `individual` / `mosque` / `charity` |
| `recipient_name` | TEXT NULL | Up to 80 chars. Optional for individuals; required for mosque and charity |
| `recipient_ref_id` | TEXT NULL | Reference list ID when chosen from a list |
| `relationship`, `relationship_side`, `relationship_line` | TEXT NULL | Individuals only |
| `occasion`, `occasion_other` | TEXT, TEXT NULL | `occasion_other` up to 60 chars when `occasion = other` |
| `giving_type` | TEXT |  |
| `on_behalf`, `on_behalf_name` | TEXT, TEXT NULL | Name required when `on_behalf = other`, up to 60 chars |
| `note` | TEXT NULL | Up to 120 chars |
| `source` | TEXT | Section 7.4 |
| `recurring_rule_id`, `occurrence_month` | TEXT NULL | Set together; unique pair |
| `eid_plan_id`, `eid_person_id`, `eid_packet_group` | TEXT NULL | Eid Planner links (10.8) |

Indexes: `(deleted, date)`, `(deleted, currency, date)`, `(deleted, category, date)`, unique `(recurring_rule_id, occurrence_month)` where not null, `(eid_plan_id, eid_packet_group)`.

**Other synced tables**

| Table | Key columns |
| --- | --- |
| `receipts` | `donation_id` (FK), `file_name` (sanitised, ≤ 100 chars), `mime_type`, `size_bytes` (≤ 10 MB), `sha256`, `width`, `height`. Local-only companions: `local_path`, `upload_state`, `attempts`, `last_error_code` |
| `recurring_rules` | Recipient fields as in donations, `amount_minor`, `currency`, `country_code`, `day_of_month` (1–31), `start_month`, `mode` (`auto` / `confirm`), `status` (`active` / `paused` / `stopped`), `resume_from_month` NULL, `backfill_decided` (bool) |
| `recurring_occurrences` | `rule_id`, `month`, `due_date`, `status` (`pending` / `logged` / `declined` / `skipped`), `amount_minor` and `currency` snapshot, `donation_id` NULL |
| `reminders` | `label` (≤ 40 chars), `month_day`, `occasion`, recipient fields, `last_amount_minor`, `last_currency`, `last_date`, `source_donation_id` |
| `budget` (singleton) | `monthly_amount_minor`, `currency` |
| `profile` (singleton) | `name` (≤ 30), `marital_status` (`single` / `married` / NULL), `home_country_code`, `home_currency`, `hijri_adjust` (−1 / 0 / 1), `friday_reminder` (bool, default false), `friday_dismissed_date`, `welcome_seen` |
| `prompt_state` (singleton) | `times_asked` (0–2), `last_asked_at`. Synced so a second device does not re-ask |
| `eid_plans` | `year` (Gregorian year of the Eid, unique), `budget_minor`, `currency` |
| `eid_people` | `plan_id`, `name` (≤ 40), relationship fields, `group` (`kids` / `families` / `others`), `amount_minor`, `donation_id` NULL |
| `eid_packet_groups` | `plan_id`, `group_key` (`kids` / `elderly`), `count` (0–999), `amount_each_minor` |

**Local-only tables** (never synced): `outbox`, `sync_state` (cursors per collection, last success), `ref_cache` (reference lists with version), `official_dates_cache`, `notification_schedule` (IDs of scheduled OS notifications), `device` (install ID, HLC state), `__drizzle_migrations`.

### 7.6 Cloud schema (Firestore, `asia-southeast1`)

```text
users/{uid}                               { schemaVersion, createdAt, lastSeenAt }
users/{uid}/donations/{id}
users/{uid}/receipts/{id}                 metadata only; file is in Cloud Storage
users/{uid}/recurringRules/{id}
users/{uid}/recurringOccurrences/{id}
users/{uid}/reminders/{id}
users/{uid}/eidPlans/{id}
users/{uid}/eidPeople/{id}
users/{uid}/eidPacketGroups/{id}
users/{uid}/singletons/{profile|budget|promptState}

reference/{listId}                        { version, updatedAt, items: [...] }   public read
officialDates/{countryCode}_{hijriYear}   { events: { eid_al_fitr: '2027-03-10', ... } }  public read
config/app                                { minSupportedVersion, notices }  public read
adminAudit/{id}                           staff only
```

Each user document mirrors its SQLite row in camelCase, plus `_hlc`, `_deleted`, `_deviceId`, `_schema` and `_serverUpdatedAt` (a server timestamp set by the write, used as the pull cursor). Receipt files live in Cloud Storage at `users/{uid}/receipts/{receiptId}`, with the original file name kept in object metadata only, so no names or amounts appear in paths.

### 7.7 Schema evolution

- **Local:** Drizzle SQL migrations, numbered, run inside a transaction before the first screen renders. Before running, the database file is copied to `backup-v<N>.db`; the copy is deleted after the next successful launch. A failed migration restores the copy and shows a "Please update the app" screen, never an empty app.
- **Migration tests:** CI keeps a fixture database from every released schema version and migrates each to head, then checks row counts and totals are unchanged.
- **Cloud:** expand-and-contract only. New fields are optional; old fields are kept until every supported app version stops reading them. zod schemas include upcasters per `_schema` version.
- **Forced update:** `config/app.minSupportedVersion` (and Remote Config) can block a version that would corrupt data; the block screen still allows Export my data.

## 8. Offline-first storage and sync

Every change is written to SQLite and to an outbox in one transaction; a sync engine pushes the outbox and pulls remote changes whenever a Firebase user exists and the network is up. Conflicts are settled per record by the newest hybrid logical clock (HLC), and a reconcile step then repairs cross-record links.

### 8.1 Sync states

| State | When | What the user sees (approved wording) |
| --- | --- | --- |
| Local only | No Firebase user yet (first open offline, or anonymous sign-in still retrying) | Nothing different; guest prompts as normal |
| Guest, replicating | Anonymous Firebase user exists | Profile: "No account yet — your records are only on this phone." (true in practice: an anonymous account cannot be recovered on another phone) |
| Account, up to date | Linked account, outbox empty | "Saved to your account" |
| Account, waiting | Linked account, outbox not empty, offline or retrying | "Saved on this phone. We'll save it to your account when you're back online." |
| Account, blocked | Auth expired, account disabled, or app version blocked | Plain-language banner with the single action that fixes it |

The words "sync" and "back up" never appear in the UI (sign-up spec wording rule).

### 8.2 The outbox

- Columns: `seq INTEGER PRIMARY KEY AUTOINCREMENT`, `collection`, `record_id`, `op` (`upsert` / `delete`), `hlc`, `payload` (JSON snapshot of the whole record), `attempts`, `next_attempt_at`, `last_error_code`.
- Written in the same transaction as the record change, always, even while local only. When the first Firebase user appears, everything already queued simply uploads.
- **Coalescing:** a new outbox row for a record deletes older unsent rows for the same record, so ten edits upload once.
- Rows are removed only after Firestore acknowledges the write.

### 8.3 Push

1. Take up to 400 outbox rows in `seq` order (Firestore allows 500 writes per batch; the margin covers future side writes).
2. Write them as one batched write: each document gets the record fields, `_hlc`, `_deleted`, `_deviceId`, `_schema` and `_serverUpdatedAt = serverTimestamp()`.
3. Security rules accept a write only if the incoming `_hlc` is greater than the stored one (HLC strings are fixed-width, so text order is time order). This makes the server the final referee of last-writer-wins.
4. If the batch is rejected as stale, retry those rows one by one; rows rejected individually are dropped from the outbox and the remote copy is pulled instead (the remote is newer).
5. Transient errors back off exponentially (2 s, 4 s … capped at 15 min, with jitter). Permanent validation errors are reported to Sentry with the error code only, kept in the outbox, and flagged for a fix release; they never block other rows.

### 8.4 Pull

- Per collection: `where _serverUpdatedAt > cursor − 60 s, orderBy _serverUpdatedAt, limit 500`, paging until empty. The 60-second overlap catches writes that committed with an earlier server time after the cursor moved; re-applying a document is harmless.
- Apply rule: if remote `_hlc` > local `hlc`, overwrite the local row (or mark it deleted); otherwise ignore it, because the local change is newer and will push.
- While the app is in the foreground and signed in, real-time listeners on the same queries give a second device near-instant updates (target ≤ 10 s, section 3.2).
- Reference data and official dates are pulled separately by version number (section 12.5), not through user sync.

### 8.5 When sync runs

App start, return to foreground, 2 seconds after the last local write (debounced), network regained, once a day in the background task (section 11.5), and on a silent "data changed" push. Only one sync runs at a time (a mutex in the engine).

### 8.6 Reconcile after pull

Last-writer-wins is per record, so two records that point at each other can disagree after a merge. A pure domain function `reconcile(snapshot)` runs after every pull and returns fixes, which are written as ordinary changes:

| Invariant | Fix |
| --- | --- |
| An Eid person marked given points to a deleted or missing donation | Clear `donation_id` (person shows as not given), as the prototype does |
| An Eid person gift donation exists but its person is deleted | Keep the donation (it is a real gift); remove the Eid link fields |
| A `logged` occurrence has no live donation | Set occurrence to `declined` (the user deleted the entry on purpose) |
| A live donation has a recurring link but no occurrence | Create the occurrence as `logged` |
| A receipt points to a deleted donation | Delete the receipt record and queue file deletion |

### 8.7 Signing out

- Sign out is allowed only when the outbox is empty. Otherwise: "Some records haven't been saved to your account yet. Connect to the internet, then try again."
- On sign out, the local database, receipt files, scheduled notifications and secure-store entries are wiped, and the app returns to a fresh guest start. The user's records remain in their account and return on next sign-in.

### 8.8 Sync tests that must pass

- Two simulated devices make random interleaved edits, deletes and offline periods (property-based, 10,000 runs); afterwards both converge to identical databases and no live record is lost.
- Kill the app at every step of push and pull (fault injection); on restart nothing is duplicated or lost.
- Clock skew: one device 3 days fast; HLC ordering still converges.
- Monthly giving generated on two offline devices for the same month produces exactly one donation (deterministic IDs).

## 9. Identity, guest mode and accounts

Every user starts as a guest with no screen to pass. A Firebase anonymous account is created silently, and "Create free account" later attaches Google, Apple or email to **that same user ID**, so no record moves.

### 9.1 First open

1. Open the local database (create it if missing), run migrations, generate the install ID and HLC seed.
2. If this is a fresh install, sign out any Firebase user left in the iOS Keychain from a previous install. Deleting the app must mean a fresh start on both platforms (sign-up spec, edge case 2).
3. Render the Dashboard immediately. Show the Welcome modal if `welcome_seen` is false.
4. In the background, call `signInAnonymously()`. On failure, retry with back-off (5 s, 30 s, 2 min, then on every foreground or network change). The app is fully usable throughout ("Local only" state, 8.1).
5. When the anonymous user exists, create `users/{uid}` and start sync.

Firebase can automatically delete anonymous accounts older than 30 days once [automatic clean-up](https://firebase.google.com/docs/auth/web/anonymous-auth) is switched on. That setting MUST stay off, because guests may stay guests for years. Inactive guest data is handled by our own retention job instead (12.3).

### 9.2 The "Create free account" prompt

The rule lives in `packages/domain/account-prompt.ts` and is a pure function of `(liveEntryCount, promptState, accountLinked, now, modalOpen)`.

| Condition | Result |
| --- | --- |
| Account linked | Never prompt |
| `times_asked = 0` and live entries ≥ 5 | Prompt (first ask) |
| `times_asked = 1` and (live entries ≥ 15 **or** ≥ 14 days since `last_asked_at`) | Prompt (second, final ask) |
| `times_asked = 2` | Never prompt again; show the permanent Profile note |
| Welcome modal or another modal open | Defer until it closes |

- Evaluated after every saved entry and on every app open (monthly-giving entries added at open can reach the threshold).
- Entries counted: all live donations, including Eid Planner and monthly-giving entries, as in the prototype.
- Shown 1.4 s after the save toast so the "recorded" message lands first. `times_asked` increments and `last_asked_at` is stamped when the prompt is **shown**, not when it is answered, so killing the app cannot cause a third ask.
- "Not now" closes it. After the first ask the toast says "No problem. You can create an account any time under Profile."
- Profile always offers "Create free account". From 5 entries, the Dashboard also shows the small bar "No account yet. Your records are only on this phone. \[Create free account\]".
- The app is never blocked, whatever the user chooses.

### 9.3 Linking flow

&#91;embedded content: Create free account · two decisions, one merge choice\]

Linking always uses `currentUser.linkWithCredential(credential)` on the anonymous user. On success the confirmation reads "Account created! Your 5 donations are saved to your account." (count and plural from the live entry count). Sync then uploads anything outstanding.

| Error code | User sees | Handling |
| --- | --- | --- |
| `auth/network-request-failed` | "No connection, try again." | Nothing changes locally |
| `auth/credential-already-in-use`, `auth/email-already-in-use` | Merge screen (9.5) |  |
| `auth/provider-already-linked` | "This account is already set up." | Refresh account state |
| `auth/too-many-requests` | "Too many tries. Please wait a few minutes." |  |
| `auth/weak-password`, `auth/invalid-email` | Inline field error |  |
| User cancels the provider sheet | Nothing | Return to the options step |

### 9.4 Providers

| Provider | iOS | Android | Notes |
| --- | --- | --- | --- |
| Google | Google Sign-In SDK, ID token | Credential Manager ("Sign in with Google" bottom sheet), ID token | Firebase `GoogleAuthProvider.credential(idToken)` |
| Apple | Native `ASAuthorizationController` via `expo-apple-authentication`, with a SHA-256 hashed nonce | Firebase OAuth provider `apple.com` in a browser tab (Custom Tabs) | Request the email scope only, not the name. Users may hide their email (relay address); that is fine. Send the authorization code to `storeAppleToken` so the server can revoke it on deletion |
| Email | Email + password, linked with `EmailAuthProvider.credential` | Same | Minimum 8 characters (prototype), maximum 128, no composition rules, common and breached passwords rejected (NIST SP 800-63B approach). Verification email sent, but not required to use the app. "Forgot password" sends a reset email. Email enumeration protection enabled in Firebase |

Apple's guideline 4.8 requires an equivalent privacy-focused login option whenever a third-party login such as Google is offered, and Sign in with Apple meets it, so Apple is offered on iOS from the first release that offers Google. It is also offered on Android so one person can use either phone.

### 9.5 Login already has an account (merge)

This happens when someone already created an account on an old phone. The phone is the source of truth for the guest records, which makes every option safe to offer.

1. Keep the current anonymous user's ID token in memory (valid for one hour) as proof of ownership.
2. Sign in to the existing account with the credential. Pull its records into staging tables (`staging_*`), not the live tables.
3. Show the merge screen with counts: "On this phone: 5 donations. In your account: 42 donations." Three choices, as the spec requires:
   - **Keep the account's records** — discard this phone's records (warn: "The 5 donations on this phone will be removed").
   - **Keep the records on this phone** — the account's records are replaced by this phone's (two-step confirmation; the replaced records are kept server-side as tombstones for 30 days so support can restore them).
   - **Combine both** (default, recommended) — union of both sets. Random IDs cannot collide. Singletons (profile, budget, prompt state) take the account's values. Eid plans for the same year combine their people; the account's Eid budget wins. Likely duplicates (same date, amount, currency and recipient) are listed afterwards for the user to review.
4. Apply the choice in one SQLite transaction, then sync.
5. Call `deleteGuest` with the old anonymous ID token; the server deletes that anonymous user and its cloud data.
6. **Cancel** at step 3: sign out of the existing account, drop staging, sign in anonymously again, and re-queue every local record for upload. Nothing on the phone changes.

A user on a new phone with no records who signs in skips step 3 and simply receives their account's records ("Welcome back").

### 9.6 Sessions

- Firebase native SDKs keep refresh tokens in the Keychain / Keystore. The app stores no tokens itself.
- If a refresh fails because the user no longer exists (deleted on another device, or a long-inactive guest removed by retention), the app shows a one-line notice, signs in anonymously again and re-uploads local records for guests; for linked accounts it wipes local data after the user confirms, because the account was deleted on purpose.
- Signing out: section 8.7.

### 9.7 Delete my account & data

- Profile → "Delete my account & data", available to guests and linked users alike (Apple requires deletion to be offered even for automatically created accounts, per [guideline 5.1.1(v)](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)).
- The screen lists what will be deleted (donations, receipts, reminders, monthly giving, Eid plans, profile, the login) and that it cannot be undone. Offer "Export my data first".
- Linked users re-authenticate (provider sheet or password) to prevent deletion by someone holding an unlocked phone.
- Calls the `deleteAccount` function (12.2). Offline: "No connection, try again"; nothing is deleted locally until the server confirms, so the user is never left half-deleted.
- A guest with no Firebase user yet (local only) is deleted locally at once.
- After success: local database, files, notifications and secure-store entries are wiped; the app restarts as a new guest.

## 10. Feature specifications and business rules

Each rule below is implemented once, in `packages/domain`, with a unit test named after the rule ID (for example `R-BUD-03`). The prototype's behaviour is the reference; differences are marked **Change** and listed again in section 22 for sign-off.

### 10.1 Log Donation

**Form fields, defaults and validation**

| Field | Behaviour | Validation message |
| --- | --- | --- |
| Where did you give? | "In {home country}" (default) or "Overseas" |  |
| Country (overseas) | Searchable list of all ISO countries except home; "Common" group first (Singapore, Malaysia, Indonesia, Brunei, Saudi Arabia, Palestine, Yemen, Syria, Sudan, Somalia, Afghanistan, Turkey); search ignores accents and matches prefix first, then substring | "Type the country" |
| Currency (overseas) | Filled from the country (CLDR default currency), changeable; "Common" currencies first |  |
| Amount | Home: chips 2, 5, 10, 20, 50, 100 plus free entry. Overseas: free entry only, in the chosen currency. Decimals limited per currency | "Enter an amount" |
| Given to | Individual / Mosque / Charity organisation |  |
| Individual | Relationship (required), Name (optional, ≤ 40). Side and line selectors as below |  |
| Mosque | Home is Singapore: Singapore mosque list + "Other (type name)". Overseas in Saudi Arabia: symbolic mosques, Masjid al-Haram preselected, + Other. Anywhere else: free text | "Choose a mosque" |
| Charity | Home is Singapore: Singapore Muslim organisations + "Used before" (the user's own past custom names) + Other. Elsewhere: free text | "Type the organisation name" |
| Reason / occasion | Grouped list (life events, doa and gatherings, prayers, symbolic Islamic dates, other). Default: Friday prayer for a home-country mosque, otherwise "No specific occasion". "Others" reveals a text box |  |
| Type of giving | Sadaqah (default) … Other, each with its one-line explanation; "What do these mean?" opens the full guide with the MUIS / local authority note |  |
| On behalf of | Myself (default), Late father, Late mother, Late parents, Others (name required) | "Enter who it's on behalf of" |
| Date | Today by default; cannot be in the future |  |
| Remind me every year | Ticks itself when the occasion is Birthday or Anniversary; reveals "Name this reminder" (≤ 40) |  |
| Repeats every month | Reveals day of month (1–31; 29–31 say "or last day"), "Started in" (not after this month) and mode (Automatically / Ask me each month). Hides date, yearly reminder and receipts; changes the button to "Save monthly donation"; resets a Friday-prayer occasion to "No specific occasion" | "Start month can't be in the future" |
| Attach receipt | Optional, several files (10.11) |  |
| Note | Optional, ≤ 120 |  |

**Relationship rules (R-REL)**

- R-REL-01: Single users never see Spouse, "Spouse's side", or in-law labels. Paternal / maternal always remains.
- R-REL-02: "Whose family?" (My side / Spouse's side) appears for Father, Mother, Both parents, Siblings, Grandparents, Uncle, Aunt, Cousins, Nephew, Niece, Distant relative, for married users only.
- R-REL-03: "Which side?" (Paternal / Maternal) appears for Grandparents, Uncle, Aunt, Cousins, Distant relative.
- R-REL-04: Spouse's side + Father / Mother / Both parents / Siblings is labelled Father-in-law / Mother-in-law / Parents-in-law / Siblings-in-law. Otherwise the label is the relationship plus qualifiers in brackets, e.g. "Uncle (maternal, spouse's side)". A "Saved as: …" preview shows under the selectors.

**Saving (R-LOG)**

- R-LOG-01: Saving writes the donation, any reminder upsert and receipt records in one transaction, then shows a toast. The toast depends on this month's budget level, and only for a home-currency, non-Eid entry dated in the current month:
  - over: "{amount} recorded. You're now {excess} over this month's budget."
  - newly near (crossed 80%): "{amount} recorded. Heads up: {pct}% of this month's budget used."
  - newly reached: "{amount} recorded. Budget reached this month — Alhamdulillah."
  - otherwise: "{amount} recorded. May it be accepted."
  - Appended when relevant: " Reminder set for every {d MMM}." and " Receipt attached." / " {n} receipts attached."
- R-LOG-02: The live budget hint under the amount shows what is left, or how far over this entry takes the month; for other currencies it says those gifts are kept separately and don't count towards the budget.
- R-LOG-03: After saving, the form resets but keeps "Where" and category, so repeat entries are fast.
- R-LOG-04: "Latest entries" shows the 5 most recent by date (then by creation time), each with attach and delete.
- R-LOG-05 (**Change**): entries can be edited from the donation detail screen. The prototype only allows delete. Editing keeps the ID, so links (Eid, recurring, receipts) survive.
- R-LOG-06: Delete asks for confirmation (native dialog). It also deletes the entry's receipts. If the entry came from the Eid Planner, the person is unticked ("Entry deleted, and unticked in your Eid Planner"). If it came from monthly giving, that month's occurrence becomes `declined` and is never regenerated.
- R-LOG-07: Presets: from a special-day card (occasion), a yearly reminder (category, relationship, recipient, last amount, occasion, reminder ticked with its label) and the Friday "log again" (last Friday gift, home country). Presets are a route parameter, not global state.

### 10.2 Totals and currency (R-TOT)

- R-TOT-01: An entry is **home** when its currency equals the profile's home currency. Only home entries are added into money totals, the budget and charts. Every other currency is totalled separately, per currency, and never converted.
- R-TOT-02: An entry is **overseas** when its country differs from the current home country. Overseas status is computed, never stored.
- R-TOT-03: Monthly budget spend = home entries in that calendar month **excluding Eid Planner entries**. Eid entries count against the Eid budget only, but still appear in history and in year and all-time totals.
- R-TOT-04: Counts ("Donations in 2027", "All time … entries") include entries in every currency. Whether overseas gifts count in "All time" is an open decision (section 22); the default follows the prototype (they do).

### 10.3 Dashboard

Top to bottom, matching the prototype:

1. **Greeting** "Salam, {name}" (or "Salam"), today's Islamic date ("12 Jamadilakhir 1448"), and "· {event} expected in {n} days" when an event is within 14 days and no card is showing. A year selector (years with entries plus the current year) sits beside it.
2. **Special-day card** (10.9) with "Log a donation" preset to that occasion.
3. **Friday card** (10.7). 4. **Dates to remember** (10.6). 5. **Monthly-giving confirmations** (10.5). 6. **Account bar** (9.2).
4. **This month:** "Given in {Month}" = R-TOT-03 spend, "of {budget} budget", percentage coloured by level, meter and message (10.4), "Change budget" link, and "Plus {x} from your Eid Planner, counted in your Eid budget instead." when relevant. Without a budget: "Set a budget".
5. **KPIs:** "{year} total" (home currency, all home entries; the label shows the currency code when overseas gifts exist) with "{pct}% of yearly budget" (budget × 12, Eid excluded, red when over); "Donations" count for the year; "All time" total and entry count.
6. **Overseas giving, {year}:** one tile per currency with name, total, count and the countries. Footnote: "Kept in each currency, so these aren't added to your totals above."
7. **Month by month:** 12 columns of home totals, current month highlighted, yearly budget used.
8. **Breakdowns** (top 6, home currency): by recipient type, by occasion, family and individuals (by relationship label), top mosques and organisations.
9. **History:** filter chips All / Individual / Mosque / Charity. On phones the Dashboard shows the latest 10 and "See all", which opens `/history` (FlashList, same filters, year selector).

Performance: all of the above is one domain function `buildDashboard(entries, profile, budget, today, year)` over rows already in memory; it must meet the 100 ms target for 5,000 entries (3.2).

### 10.4 Budget (R-BUD)

- R-BUD-01: The monthly budget is a home-currency amount (0 = no budget). It is stored with its currency.
- R-BUD-02: Level for spend `s` against budget `b` (both minor units): **over** if s > b; **done** if s = b; **near** if s ≥ 80% of b; **ok** otherwise; **none** if b = 0.
- R-BUD-03: Meter: ok and done are green, near is amber, over shows the budget share green and the excess red. Messages:
  - ok: "{left} left to give this month."
  - near: "Nearing your budget. You've used {pct}% — {left} left this month."
  - done: "Budget reached this month. Alhamdulillah."
  - over: "{excess} over budget this month ({pct}% of {budget}). Giving more is never wrong — just make sure it's still comfortable for you, or adjust your budget."
- R-BUD-04: "{amount} a month is already set as monthly giving ({pct}% of your budget)." sums active home-currency rules.
- R-BUD-05: "How much should I give?" = nett monthly income × share (slider 0–20% in 0.5 steps, default 2.5%, tick marks at 0, 2.5, 5, 10, 15, 20). The income value lives in component state only: never persisted, never logged, never in analytics or crash breadcrumbs, cleared when the screen loses focus, and the input disables autofill and keyboard learning where the platform allows. "Use as budget" copies the rounded result into the budget field, which still needs "Save". The note "We do not store this entry…" is shown verbatim.
- R-BUD-06: If the home currency changes while a budget exists in the old currency, the budget is paused (not counted) and the Budget tab asks the user to confirm or re-enter it in the new currency.

### 10.5 Monthly giving (R-REC)

- R-REC-01: A rule is created from the Log form with "Repeats every month". It stores the recipient fields, amount, currency, country, day of month, start month and mode.
- R-REC-02: Due date for month M = day of month, clamped to M's last day (31 → 30 Apr, 28 or 29 Feb).
- R-REC-03: `generate(rule, existingOccurrences, today)` returns the occurrences to create: every month from `max(start_month, resume_from_month)` to the current month whose due date ≤ today and which has no occurrence yet. Auto mode creates the occurrence as `logged` with its donation (dated the due date); confirm mode creates it as `pending`. IDs are deterministic (7.3), so running this twice, on two devices, or after a sync never adds a month twice.
- R-REC-04: Generation runs on app open, return to foreground, after each sync pull, and in the daily background task. On open, if any were added automatically: "{n} monthly donations added to your log automatically".
- R-REC-05: Back-fill is offered once, at setup, only if earlier months are due: "Add the earlier months too? You said this started in {Month Year}. Add the {n} earlier months to your log so your totals are complete?" Yes → generate from the start month. No → set `resume_from_month` to the current month. Then: "Monthly giving set up. {n} months added to your log." or "… First entry on {date}."
- R-REC-06: Confirm mode shows, per rule, the oldest pending month: "Did your {amount} to {recipient} go out on {date}?" "Yes, log it" creates the donation with the occurrence's amount snapshot; "It didn't" marks it `declined`.
- R-REC-07: Pause sets status `paused`; nothing is generated. Resume sets `resume_from_month` to next month if this month's due date has passed, otherwise this month. Months while paused are skipped for good.
- R-REC-08: Stop asks to confirm ("Stop? Past entries stay"), sets `stopped` and declines any pending months. Past entries stay. Stopped rules are hidden from the list.
- R-REC-09: Change amount applies to months generated from now on. Existing and pending occurrences keep their snapshot amounts ("Now {amount} a month from next time").
- R-REC-10: The Monthly giving card shows each rule with amount, day, mode and paused state, and the monthly total as home currency plus one figure per other currency.
- R-REC-11: Monthly-giving entries carry the 🔁 tag in history. Receipts can be attached to individual generated entries afterwards.

### 10.6 Yearly reminders (R-YR)

- R-YR-01: Created when "Remind me every year on this date" is ticked. The default label comes from the entry: "{who}'s birthday", "{who}'s anniversary" or "Anniversary", otherwise "{occasion} · {who}".
- R-YR-02: Upsert key is (month-day, label case-insensitive): logging the same birthday again updates the reminder's last amount, currency and date instead of adding a second one.
- R-YR-03: Repeats on the same Gregorian month-day. 29 Feb falls on 28 Feb in non-leap years.
- R-YR-04: "Dates to remember" on the Dashboard lists reminders due from today to 7 days ahead, soonest first: label, weekday and date, "last time you gave {amount}", and "Today" / "Tomorrow" / "in {n} days", with "Log donation" (preset per R-LOG-07).
- R-YR-05: Notifications 7 days before and on the day (11.2).
- R-YR-06: Profile lists all reminders by date with remove. Removing a reminder never touches past donations.
- Repeating by Islamic date (e.g. doa tahlil on the date of passing) is an open decision (section 22). The schema leaves room: a future `calendar` column (`gregorian` / `hijri`) with a Hijri month-day.

### 10.7 Friday reminder (R-FRI)

- R-FRI-01: Off by default. Profile toggle: "Friday reminder — A gentle note on Fridays: 'Jumaah Mubarak. A good day for sadaqah.'" Worded for everyone; it never assumes Friday prayer attendance.
- R-FRI-02: The Dashboard card shows on Fridays (device-local day) unless dismissed today (✕ stores `friday_dismissed_date`) or any entry is dated today.
- R-FRI-03: "Log {amount} to {recipient} again" repeats the most recent Friday gift that was home currency, not overseas and not from the Eid Planner. Without one: "Log a donation".
- R-FRI-04: A local notification on Friday at the chosen time (default 11:00) when enabled; it is skipped if an entry was already logged today (checked by the daily background task where possible; otherwise it simply shows).

### 10.8 Eid Planner (R-EID)

**Model (Change):** one plan per Eid year, each with its own budget, people and packet groups. The prototype keeps a single plan whose year can be switched, which would mix years. A new year's plan offers "Copy people from {last year}" (names, relationships, groups and amounts; nothing ticked).

- R-EID-01: Planned = sum of people's amounts + (kids packets × amount each) + (elderly packets × amount each).
- R-EID-02: Given = sum of the plan's live linked donations (people gifts and packet gifts). It is always read back from the log, so the planner and the log cannot disagree.
- R-EID-03: KPI cards: Eid budget with bar and "{x} planned / {y} unplanned (still free to assign)" or "{x} over budget"; Planned with "{n} people + {m} packets"; Given so far with % of plan. Near (≥ 80%) and over alerts use R-BUD-02 levels against the Eid budget.
- R-EID-04: Add someone: name (required), relationship (Kids, Nephew, Niece, Cousins first; Stranger excluded; single users filtered per R-REL-01), side and line selectors, group (Kids / Families / Others), amount chips 2, 5, 10, 20, 50 (default 10). Adding past the budget toasts "Your Eid plan is now over budget".
- R-EID-05: Ticking a person creates donation `don_eid_<personId>`: Individual, recipient = name, the relationship, occasion Eid al-Fitr, type Eid money, note "Eid {year} plan", today's date, home currency, source `eid_person`. Toast: "{amount} to {name} added to your donation log". Unticking deletes that donation: "Unticked. Removed from your donation log". Both happen in one transaction with the person update.
- R-EID-06: Removing a ticked person asks "Remove + log entry?" and deletes both. Removing an unticked person deletes only the person.
- R-EID-07: People I may meet: Kids and Elderly, each with packets to prepare and amount each (defaults 2 and 5). "+ Gave one" logs an entry (recipient "Child I met" / "Elder I met", relationship Stranger, occasion Eid al-Fitr, type Eid money, source `eid_packet`) until the given count equals the packet count ("All packets given — add more above"); it needs an amount first. "−" deletes that group's most recent packet entry. The display is "{given} / {count}".
- R-EID-08: Eid entries count only against the Eid budget (R-TOT-03).
- R-EID-09: The year list offers last year, this year and next year, plus any year that has a plan.

### 10.9 Islamic dates (R-HIJ)

**Order of truth for a given Gregorian date and the user's home country:**

1. **Official month start.** If the server has an official start date for that Hijri month in the home country (e.g. MUIS announces 1 Syawal 1448 = a given date), the Hijri day is counted from it. Such dates are never labelled "expected".
2. **Calculation.** Otherwise use the Umm al-Qura table, shifted by the user's adjustment (−1 / 0 / +1 day, Profile). Ramadan start, Day of Arafah, Eid al-Fitr and Eid al-Adha then carry the "expected" tag with the tooltip "The official date is announced by MUIS" (or "your local religious authority" outside Singapore).

**Change:** the prototype keys official data by single days (`{date: [month, day]}`); the real app stores official **month starts** per country and Hijri year, which covers every day of the month, not only the event day.

**Events (R-HIJ-02)**

| Hijri date | Name | Occasion preset | Officially announced |
| --- | --- | --- | --- |
| 1 Muharram | Awal Muharram | `awal_muharram` | No |
| 10 Muharram | Ashura | `ashura` | No |
| 12 Rabiulawal | Mawlid Nabi | `mawlid_nabi` | No |
| 27 Rejab | Isra' Mi'raj | `isra_miraj` | No |
| 15 Syaaban | Nisfu Sya'ban | `nisfu_syaban` | No |
| 1 Ramadan | First day of Ramadan | `ramadan` | Yes |
| 1 Syawal | Eid al-Fitr | `eid_al_fitr` | Yes |
| 9 Zulhijjah | Day of Arafah | `day_of_arafah` | Yes |
| 10 Zulhijjah | Eid al-Adha | `eid_al_adha` | Yes |

- R-HIJ-03: On an event day the card reads "Today is {name}" + "A good day for sadaqah." On other Ramadan days: "Ramadan day {n}" with "Every good deed in Ramadan counts for more." (days 1–20) or the Laylatul Qadr text and occasion (days 21 onward).
- R-HIJ-04: "Coming up" scans 1–14 days ahead for the nearest event.
- R-HIJ-05: Month names (display): Muharram, Safar, Rabiulawal, Rabiulakhir, Jamadilawal, Jamadilakhir, Rejab, Syaaban, Ramadan, Syawal, Zulkaedah, Zulhijjah.
- R-HIJ-06: The Umm al-Qura module holds the month-start table for 1356–1500 AH (the published Umm al-Qura range used by ICU). CI compares it against Node.js's full-ICU `Intl` (`islamic-umalqura`) for every day in the range; any mismatch fails the build. Dates outside the range show no Hijri date rather than a wrong one.
- R-HIJ-07: When official dates change, the device refreshes its cache (12.5) and re-plans notifications (11.3).

### 10.10 Country and currency change (R-CTY)

- R-CTY-01: Profile → My country: searchable list of all countries (common first); currency fills from the country and can be changed.
- R-CTY-02: Past records keep their own country and currency; nothing is recalculated. Because overseas status is derived (R-TOT-02), gifts made in the old home country now show as overseas, and gifts made in the new home country now show as local, exactly as the prototype's rewrite achieved, without rewriting anything.
- R-CTY-03: Toast: "Country updated. New donations will be in {currency}." plus, when a budget exists in another currency, "Please check your monthly budget is in {currency} too." (and R-BUD-06 applies).
- R-CTY-04: The "Overseas" country list always excludes the current home country.
- R-CTY-05: Mosque and charity lists exist for Singapore only at launch; elsewhere a note says "Mosque and charity lists are only for Singapore for now. You can type the names." Lists are keyed by country on the server so Malaysia or Brunei can be added without a release.
- R-CTY-06 (**Change**): the prototype's "Other country" option is dropped, because the full ISO list is present.

### 10.11 Receipts (R-RCP)

- R-RCP-01: Sources: camera, photo library (system photo picker, which needs no library permission on either platform), and files (document picker). Accepted: JPEG, PNG, HEIC/HEIF, WebP, PDF, EML, MSG, DOC, DOCX. Anything else is refused with "This file type can't be attached."
- R-RCP-02: Images are resized so the long edge is at most 1,600 px and re-encoded as JPEG at quality 0.82 (prototype settings). Re-encoding drops all EXIF metadata, including GPS location; a unit test asserts no EXIF survives. HEIC is converted to JPEG.
- R-RCP-03: Maximum 10 MB per file after processing ("{name} is too big (max 10 MB)") and, **Change**, at most 10 receipts per donation.
- R-RCP-04: Files are saved to the app's private storage first, so attaching works offline. An upload queue sends them to `users/{uid}/receipts/{receiptId}` with resumable uploads, retrying with back-off; state is visible as a small "saving" mark on the tag.
- R-RCP-05: Viewing: images and PDFs open in-app (image viewer; QuickLook on iOS, the system PDF renderer on Android). Email and Word files open through the system share or preview sheet; the app never parses them.
- R-RCP-06: On a second device, files download only when opened and are cached; cached copies of uploaded files can be evicted when the cache exceeds 200 MB.
- R-RCP-07: Removing a receipt or its donation deletes the local file and queues deletion of the cloud copy.

### 10.12 Welcome and Profile

- Welcome (first open only): "Salam! Welcome to Muslim Give", "Two quick questions so the app fits you. No email needed." Name (≤ 30), Single / Married, Continue or "Skip for now". Toasts "Salam, {name}!" / "All set" / "You can fill this in any time under Profile".
- Profile cards: About me (name, marital status); My country (country, currency, Islamic date adjustment with today's computed Islamic date shown); Reminders (Friday toggle, yearly list, notification time); My account (status, Create free account, Sign in to an existing account, Sign out, Delete my account & data); My data (Export my data, Privacy policy); About (version, open-source licences).
- Changing marital status to Single does not alter past entries; it only hides spouse options from now on.

### 10.13 Export my data (R-EXP)

- R-EXP-01: Generated entirely on the device from SQLite, then handed to the system share sheet. Nothing is uploaded.
- R-EXP-02: `donations.csv`: date, amount (decimal text in the currency's precision), currency, country, overseas (yes/no), given to, recipient, relationship, occasion, type of giving, on behalf of, note, source, monthly giving, Eid plan, receipts (count). Human-readable labels, not codes.
- R-EXP-03: CSV is UTF-8 with a byte-order mark (so Excel shows Malay and Arabic names correctly), RFC 4180 quoting, and formula-injection protection: cells starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with an apostrophe.
- R-EXP-04: "Everything" option: a ZIP with all tables as CSV and JSON, plus receipt files downloaded first (with progress, cancellable). This meets the PDPA access request and gives a clean way to move to another tool.

## 11. Notifications and background work

All reminders are **local notifications** computed and scheduled on the phone, so they fire offline and no server ever learns a user's birthdays or giving dates. Remote push is used for one thing only: telling devices that official Islamic dates or reference lists changed.

### 11.1 Permission

- Never ask at first launch. Ask in context, with a short pre-prompt explaining the benefit, the first time the user: turns on the Friday reminder, ticks "Remind me every year", creates a confirm-mode monthly rule, or taps "Remind me on special Islamic days" on a special-day card.
- iOS: request alert, sound and badge. Android 13+: request the `POST_NOTIFICATIONS` runtime permission; below Android 13 it is granted at install.
- If denied, features still work in-app; Profile shows "Notifications are off. Turn on in Settings" with a deep link to the system settings page. Never re-ask through the system dialog after a denial.

### 11.2 What is sent

| Type | When (device local time) | Example text | Android channel | Default |
| --- | --- | --- | --- | --- |
| Special Islamic day | 08:00 on the day; 20:00 the evening before for Ramadan and both Eids | "Today is Ashura. A good day for sadaqah." / "Eid al-Fitr is expected tomorrow." | Islamic days | On once permitted |
| Yearly date | 09:00, 7 days before and on the day | "Mak's birthday is in 7 days." / "Today: Mak's birthday." | Dates to remember | On |
| Friday | 11:00 Fridays | "Jumaah Mubarak. A good day for sadaqah." | Friday | Off |
| Monthly giving (confirm mode) | 10:00 on the due date | "Did your monthly gift to Masjid Sultan go out today?" with actions "Yes, log it" / "It didn't" | Monthly giving | On |
| Monthly giving (auto mode) | None | Entries appear quietly; the open-app toast reports them |  |  |

Tapping any notification opens the matching screen with presets (6.4). Action buttons open the app and apply the choice, so the write always happens with the full app running.

**Lock-screen privacy (Change):** amounts never appear in notification text. A Profile setting "Show names in notifications" (default off) controls whether recipient and reminder names appear; when off, the text is generic ("You have a monthly gift to confirm"). iOS also gets a hidden-preview placeholder.

### 11.3 Scheduling engine

- A pure domain function `planNotifications(snapshot, today, settings)` returns every notification due in the next 60 days, each with a deterministic key (e.g. `yr:<reminderId>:2027-03-05:before`).
- The platform layer diffs that plan against `notification_schedule` and cancels or adds only what changed.
- **iOS allows at most 64 pending local notifications per app.** The planner keeps the soonest 50 (headroom for system-scheduled ones); the rolling window means later ones are added as earlier ones fire.
- Android: inexact scheduling within about 15 minutes is acceptable, so the app does **not** request the exact-alarm permission (`SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`), which Play restricts.
- Re-plan triggers: app open and foreground, any change to reminders, rules, profile or settings, a time-zone change, sync pull, official-date refresh, the daily background task, and device reboot (Android re-registers via the library's boot receiver).

### 11.4 Remote push

- Devices subscribe to one Messaging topic for their home country, e.g. `official-dates-SG`, and re-subscribe on country change. Topics mean the server holds **no device tokens** and no per-user targeting is possible.
- The publish function (12.4) sends a data-only message `{type: 'official_dates', country, version}` or `{type: 'reference', listId, version}`. The app fetches the new version, then re-plans.
- Silent pushes are best-effort on both platforms (throttled by iOS, and delayed by Doze on Android). Correctness never depends on them: the app also checks versions on every foreground.

### 11.5 Background task

- One task, registered with `expo-background-task` (BGTaskScheduler on iOS, WorkManager on Android), minimum interval 24 h, requiring network for the sync part only.
- Order: generate monthly-giving occurrences → sync → refresh reference and official dates → re-plan notifications. It must finish within 25 s (iOS gives about 30 s).
- The OS may skip it (iOS after a force-quit, low power mode, Android battery saver). Nothing relies on it; it only makes notifications and the Dashboard fresher.
- No foreground services, no persistent background location, no wake locks.

## 12. Backend (Firebase)

The backend is deliberately thin: security rules do most of the work, and a handful of Cloud Functions handle what a phone must not be trusted to do (deleting accounts, publishing dates, clean-up).

### 12.1 Projects and regions

| Project | Purpose | Who can access |
| --- | --- | --- |
| `muslimgive-dev` | Local development against emulators, plus a shared dev backend | Developers |
| `muslimgive-staging` | Internal and TestFlight / Play internal builds, synthetic tests | Developers, testers |
| `muslimgive-prod` | Store builds only | Two named owners; developers have no production data access by default |

- Firestore database, Cloud Storage bucket and Cloud Functions are all created in `asia-southeast1` (Singapore). The Firestore location cannot be changed after creation, so it is set correctly on day one and checked by an infrastructure test.
- Firebase Authentication is a global Google service; sign-in records (user ID, provider, email) are processed outside Singapore. This is disclosed in the privacy policy (section 14).
- Blaze plan with budget alerts at 50%, 90% and 100% of a monthly budget agreed in section 22, sent to both owners.
- All configuration (rules, indexes, functions, Remote Config defaults) is deployed from the repository by CI; console edits in production are not allowed.

### 12.2 Cloud Functions

All callable functions: App Check enforced, authentication required (except where noted), input validated with the shared zod schemas, idempotent, structured logs with user IDs hashed and no record content.

| Function | Trigger | What it does |
| --- | --- | --- |
| `deleteAccount` | Callable | Revokes Apple tokens if present; recursively deletes `users/{uid}`; deletes every object under `users/{uid}/` in Storage; deletes the Auth user; writes an audit entry (hashed uid, time, outcome). Retries safely if interrupted |
| `deleteGuest` | Callable, takes the old anonymous ID token | Verifies the token belongs to an anonymous user, then deletes that user and its data (merge flow, 9.5) |
| `storeAppleToken` | Callable | Exchanges a Sign in with Apple authorisation code for a refresh token and stores it encrypted (Cloud KMS) for later revocation |
| `onReceiptUploaded` | Storage object finalised | Checks size and real file type from magic bytes; deletes files that don't match the declared type |
| `publishOfficialDates` | Callable, staff role `reviewer` | Validates and publishes a reviewed official-dates draft; bumps the version; sends the topic message |
| `publishReferenceList` | Callable, staff role `reviewer` | Same for mosque, charity and other lists |
| `retentionSweep` | Scheduled daily | Deletes anonymous users with no activity for 365 days, and their data; purges tombstones older than 90 days; removes merge staging leftovers |
| `exportFirestore` | Scheduled daily | Managed export to a backup bucket in the same region, 35-day lifecycle rule |
| `appleServerNotifications` | HTTPS (no auth; Apple-signed JWT verified) | Handles Sign in with Apple events (consent revoked, account deleted) |

The app updates `users/{uid}.lastSeenAt` at most once a day, which `retentionSweep` uses. Because the phone holds the records, a long-inactive guest who returns simply gets a new anonymous account and re-uploads (9.6).

### 12.3 Firestore security rules (outline)

Rules are tested with `@firebase/rules-unit-testing` against the emulator; every allow and deny path has a test.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }
    function meta() {
      let d = request.resource.data;
      return d._hlc is string && d._hlc.size() <= 64
        && d._deleted is bool
        && d._deviceId is string && d._deviceId.size() <= 64
        && d._schema is int
        && d._serverUpdatedAt == request.time;
    }
    // last writer wins, enforced by the server
    function newer() { return resource == null || request.resource.data._hlc > resource.data._hlc; }
    function str(v, max) { return v == null || (v is string && v.size() <= max); }
    function donation() {
      let d = request.resource.data;
      return d._deleted == true || (
        d.amountMinor is int && d.amountMinor > 0
        && d.currency is string && d.currency.size() == 3
        && d.countryCode is string && d.countryCode.size() == 2
        && d.date is string && d.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && d.category in ['individual', 'mosque', 'charity']
        && str(d.recipientName, 80) && str(d.note, 120));
    }
    match /users/{uid} {
      allow read: if isOwner(uid);
      allow create, update: if isOwner(uid)
        && request.resource.data.keys().hasOnly(['schemaVersion', 'createdAt', 'lastSeenAt']);
      match /donations/{id} {
        allow read: if isOwner(uid);
        allow create, update: if isOwner(uid) && request.resource.data.id == id
          && meta() && newer() && donation();
      }
      // ...one block per collection, each with its own validator
      // no client deletes anywhere: deletion is a tombstone; hard deletes are server-only
    }
    match /reference/{listId}   { allow read: if true; }
    match /officialDates/{key}  { allow read: if true; }
    match /config/{docId}       { allow read: if true; }
    // adminAudit and everything else: no client access
  }
}
```

### 12.4 Storage rules (outline)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/receipts/{receiptId} {
      allow read, delete: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid
        && request.resource.size <= 10 * 1024 * 1024
        && request.resource.contentType.matches(
          'image/(jpeg|png|webp)|application/pdf|message/rfc822|application/vnd[.]ms-outlook|application/msword|application/vnd[.]openxmlformats-officedocument[.]wordprocessingml[.]document');
      allow update: if false;
    }
  }
}
```

A per-user storage quota (proposed 500 MB) is checked by `onReceiptUploaded`, which deletes over-quota uploads and flags the receipt so the app can say "Your receipt storage is full."

### 12.5 App Check

Play Integrity on Android and App Attest on iOS (DeviceCheck fallback on older devices). Enforced on Firestore, Storage and every callable function in production. Debug providers are compiled only into development builds. Roll-out: monitor App Check metrics for two weeks in production before enforcing, so no genuine users are locked out.

### 12.6 Reference data and official dates

- **Reference lists** (`reference/{listId}`, e.g. `mosques-SG`, `charities-SG`, `mosques-SA-symbolic`) each hold `version`, `updatedAt` and `items` with stable IDs, display names and an `active` flag. Retired items stay (inactive) so old entries keep resolving.
- The app **bundles a snapshot** of every list at build time, so the very first open, even offline, has complete lists. On foreground it compares versions with `config/app.referenceVersions` and fetches only changed lists.
- Countries and currencies are generated from CLDR and bundled in the app; a server list may override display names or ordering without a release.
- **Official dates** live in `officialDates/{countryCode}_{hijriYear}`, holding `monthStarts` (Hijri month number → Gregorian date), `source` (e.g. "MUIS announcement, 1 Mar 2027"), `version`, `enteredBy`, `reviewedBy`. A month start more than 2 days away from the calculated one is rejected unless an override reason is recorded (catches typing errors).

### 12.7 Admin console

- A small React web app on Firebase Hosting, at an unlisted address, behind staff Google sign-in with multi-factor authentication. Roles via custom claims: `editor` (drafts) and `reviewer` (publishes). Publishing needs two different people.
- The console never writes Firestore directly; it calls the publish functions, which write the audit log.
- Security rules give staff **no** access to user data. Support cases that need a record restored go through a documented, owner-approved runbook (section 20).

## 13. Security

The security baseline is **OWASP MASVS v2 Level 1 for every control, plus selected Level 2 controls for storage, authentication and privacy**, verified with the OWASP MASTG before each major release and by an external assessment before public launch. Donation records reveal religion and giving habits, so they are treated as sensitive personal data throughout.

### 13.1 Threat model

| # | Threat | Impact | Mitigations |
| --- | --- | --- | --- |
| T1 | Another user reads or changes my records | Severe privacy breach | Owner-only security rules on every path; rules tests for every collection; no client list queries outside `users/{uid}` |
| T2 | A modified or scripted client writes junk or huge data | Cost, corruption | Field validation and size limits in rules; App Check; storage quota; per-user write rate alarms |
| T3 | Account takeover through email and password | Exposure of all records | Breached-password rejection, Firebase rate limiting, email enumeration protection, re-authentication before deletion and email change; Google and Apple as stronger options |
| T4 | Lost or shared unlocked phone | Local exposure | Relies on the OS lock screen; amounts and names hidden from notifications by default; optional app lock is on the roadmap (section 22) |
| T5 | Malicious receipt file | Code execution, phishing | Files are never parsed by the app; images re-encoded; other types open only in system viewers; magic-byte check on upload |
| T6 | Insider or admin misuse | Breach | Staff have no data access in rules; production IAM limited to two owners; Cloud Audit Logs (data access) on; break-glass procedure logged |
| T7 | Supply-chain compromise of a dependency or build | Full compromise | Pinned versions, lockfile, review of new dependencies, OSV and npm audit in CI, SBOM per release, builds only from CI with protected secrets |
| T8 | Personal data leaking into logs, analytics or crash reports | Breach, PDPA exposure | Redacting logger, Sentry scrubbing rules, allow-listed analytics events with no amounts, names or notes; automated test asserts the redaction |
| T9 | Wrong official date published | Wrong reminders for a whole country | Two-person publish, ±2 day guard, versioned documents with one-click rollback |
| T10 | Abuse of the Firebase API key | Cost | API key restrictions (app IDs, signing certificates, allowed APIs), App Check, budget alerts. The key is an identifier, not a secret |
| T11 | Reuse of a captured anonymous ID token to delete a guest | Data loss | `deleteGuest` accepts only anonymous users' tokens, which expire within an hour, and only over App Check-verified calls |

### 13.2 Controls by MASVS area

| MASVS area | Controls |
| --- | --- |
| STORAGE | Data lives in the app sandbox only. iOS files use Data Protection class "complete until first user authentication" (so the background task can run after the first unlock). Android relies on file-based encryption (all supported versions). No personal data in `AsyncStorage`, logs, the clipboard (except an explicit copy) or temporary files left behind. Caches exclude receipts of other users by design (one user per install). |
| CRYPTO | No custom cryptography. Platform TLS, Keychain and Keystore through `expo-secure-store`; Apple refresh tokens encrypted with Cloud KMS on the server. SHA-256 only for nonces and file checksums. |
| AUTH | Firebase-issued tokens only; refresh tokens held by the native SDKs. Re-authentication for account deletion and email change. Sign in with Apple uses a hashed nonce. |
| NETWORK | TLS everywhere: App Transport Security left at its strict default on iOS; `cleartextTrafficPermitted=false` in the Android network security config. No certificate pinning, because Google rotates its certificates and pinning would risk outages; platform trust plus App Check is the chosen model. |
| PLATFORM | No WebViews in the app (provider sign-in uses the system browser tab or native sheets). Deep links validated against an allow-list of routes and parameters. Exported Android components limited to the launcher activity and verified app links. `FLAG_SECURE` on the income calculator screen so it never appears in screenshots or the app switcher; iOS blurs the same screen when backgrounded. |
| CODE | TypeScript strict, ESLint security rules, no `eval` or dynamic `Function`, input validated with zod at every boundary, dependencies scanned, Android R8 minification for release. |
| RESILIENCE | App Check (attestation). No root or jailbreak blocking: it would lock out genuine users of a privacy tool for little gain at Level 1. |
| PRIVACY | Data minimisation (section 14), no advertising identifiers, no third-party SDKs beyond the approved list, in-app export and deletion, privacy labels kept accurate. |

### 13.3 Secrets and configuration

- No secrets in the app bundle or repository. Firebase config files are public identifiers and are restricted as in T10.
- CI secrets (EAS token, store keys, Sentry auth token) live in GitHub encrypted environments with required reviewers for production.
- Android upload key and iOS distribution certificate are managed by EAS credentials; the Play app signing key is held by Google; recovery copies kept by the two owners in a password manager.
- Secret scanning (GitHub) and push protection are on; any leaked credential is rotated the same day.

### 13.4 Device backups

OS backups (encrypted iCloud backup, Android backup with screen-lock encryption) MAY include the database and receipts, because restoring a phone from backup is the guest's only recovery path. Caches and `notification_schedule` are excluded. Auth tokens are stored with "this device only" accessibility, so a restored phone starts a new anonymous session and re-uploads (9.6). This behaviour is stated in the privacy policy.

## 14. Privacy and compliance

The app collects only an optional first name, marital status, home country, an optional email, the donation records and receipts; it never asks for phone number, NRIC, salary or bank details. Each PDPA obligation and store rule below maps to a concrete feature or process, and the owner of each is named in section 22. This section is engineering guidance, not legal advice; the privacy policy itself should be reviewed by a Singapore data-protection professional before launch.

### 14.1 Data inventory

| Data | Why it is needed | Where it is stored | Kept for | Shared with |
| --- | --- | --- | --- | --- |
| Donation records, reminders, rules, Eid plans | The app's purpose | Phone; Firestore (Singapore) | Until the user deletes them or the account | Google Cloud as processor |
| Receipts | User's own files | Phone; Cloud Storage (Singapore) | Same | Google Cloud |
| First name, marital status | Greeting; hiding spouse options | Phone; Firestore | Same | Google Cloud |
| Home country, currency, Islamic date adjustment | Totals, lists, Islamic dates | Phone; Firestore | Same | Google Cloud |
| Email and sign-in provider IDs | Create free account | Firebase Auth (global) | Until account deletion | Google; Apple if Sign in with Apple is used |
| Anonymous user ID, install ID | Linking a phone to its records | Phone; Firebase Auth | Account lifetime; guest inactive 365 days | Google |
| Crash reports and performance traces | Reliability | Sentry (region chosen at setup) | 90 days | Sentry as processor |
| Analytics events (approved list only) | Product decisions | Per section 22 decision | 14 months maximum | Processor per decision |
| Nett income in the calculator | Shown on screen only | Not stored anywhere | Cleared on leaving the screen | No one |

### 14.2 PDPA obligations

| Obligation | How the app meets it |
| --- | --- |
| Consent and notification | Plain-words privacy notice in the Welcome flow (one line + link) and in Profile; the account sheet states "We only keep your email and your donation records." (prototype wording) |
| Purpose limitation | Data is used only to run the app; no marketing, profiling or sale. Written into the policy and enforced by the no-third-party-SDK rule |
| Access and correction | Every record is visible and editable in-app (R-LOG-05); Export my data gives a complete copy (R-EXP) |
| Accuracy | Users enter and correct their own data |
| Protection | Section 13 |
| Retention limitation | Deletion on request; inactive guests removed after 365 days; tombstones after 90 days; backups expire after 35 days; logs after 30 days |
| Transfer limitation | Firestore, Storage and Functions in Singapore; Auth and crash reporting may process data abroad, disclosed in the policy, with the processors' contractual safeguards |
| Data breach notification | Incident runbook (20.4). A breach assessed as notifiable must be reported to the PDPC [no later than three calendar days](https://www.pdpc.gov.sg/Report-Data-Breach/Before-You-Report-A-Data-Breach-3/Info) after the assessment, and affected people told at the same time or after. Notifiable means likely significant harm, or [500 or more people affected](https://sso.agc.gov.sg/SL/PDPA2012-S64-2021) |
| Accountability | A named Data Protection Officer with a published business contact; this document, the ADRs and the data inventory are the written policies |

### 14.3 Apple App Store

- **Account deletion** in-app for every user, including automatically created (guest) accounts, and revocation of Sign in with Apple tokens on deletion ([5.1.1(v)](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)).
- **Sign in with Apple** offered alongside Google ([4.8](https://developer.apple.com/app-store/review/guidelines/#login-services)).
- **Privacy nutrition labels:** declare contact info (email), user content and possibly "other financial info" (donation amounts), identifiers (user ID), diagnostics; nothing used for tracking. The exact categories are confirmed in App Store Connect at submission.
- **Privacy manifest** (`PrivacyInfo.xcprivacy`): declare required-reason API use (e.g. UserDefaults, file timestamps, disk space) for the app, and check that every bundled SDK ships its own manifest. CI fails if a new SDK lacks one.
- No App Tracking Transparency prompt, because nothing tracks users across apps.
- Review notes explain that the app never handles money, and provide a test path (no login needed).

### 14.4 Google Play

- **Data safety form** completed to match 14.1, including the data deletion questions.
- **Account deletion** both in-app and through a [web page where users can request deletion](https://support.google.com/googleplay/android-developer/answer/13327111) without reinstalling the app. The web page verifies the request by signing in with the same provider, then calls `deleteAccount`.
- **Target API level** per section 5.1.
- Permissions limited to: internet, notifications (Android 13+), camera (only when the user takes a receipt photo), and boot completed (to restore scheduled notifications). No storage, location, contacts or exact-alarm permissions.

### 14.5 Content and wording safeguards

- Religious guidance (types of giving, zakat notes) is labelled "A simple guide only" and points to MUIS or the local authority, as in the prototype. Copy changes in this area need Isa's approval.
- No feature may reveal salary (MBMF was removed for this reason); this is a code-review checklist item.

## 15. iOS and Android: platform differences

The rules, data and copy are identical on both platforms; the interaction patterns are not. Each row below is a requirement: build both columns, and test both columns on real devices (section 16).

### 15.1 Interaction and UI

| Topic | iOS | Android | Implementation |
| --- | --- | --- | --- |
| Back navigation | Edge swipe; no system back button | System back button or gesture, including predictive back | Native stack handles both. Forms with unsaved input intercept back with "Discard this donation?" on both platforms |
| Tab bar | Native tab bar (system styling of the current iOS version) | Material 3 navigation bar | Native bottom tabs from Expo Router; no custom-drawn tab bar |
| Sheets and modals | Form sheet with detents, swipe to dismiss | Modal bottom sheet or full-screen dialog | Route presentation option per platform; the merge screen is non-dismissible on both |
| Alerts and confirmations | `UIAlertController`, destructive buttons in red | Material dialog | Native alert API; destructive actions labelled with the verb ("Delete", "Stop") |
| Date picker | Compact or inline `UIDatePicker` | Material date picker dialog | Platform picker for the donation date, with a max of today |
| Month picker ("Started in") | No native month-only picker | Same | Shared custom month-year wheel or list component |
| Number keyboard | Decimal pad has no Done key | Numeric keyboard; decimal separator follows the locale | Input accessory "Done" bar on iOS; the parser accepts both `.` and `,` as decimal separators |
| Safe areas | Notch, Dynamic Island, home indicator | Edge-to-edge is always on (current target SDK); status and navigation bars overlay content | `react-native-safe-area-context` on every screen; screenshot tests on both |
| Text size | Dynamic Type | Font scale and display size | Both honoured up to 200%; tested at maximum |
| Haptics | Taptic Engine | Vibration with haptic constants | `expo-haptics` only on save success and destructive confirm; respect system settings |
| Password autofill | iCloud Keychain, `textContentType` = `username` / `newPassword`, associated domains `webcredentials:` | Autofill framework hints, Credential Manager | Correct content types so the OS offers to save and generate passwords |
| App icon | Light, dark and tinted variants | Adaptive icon with monochrome layer for themed icons | Generated from one source in the config plugin |

### 15.2 System services

| Topic | iOS | Android | Implementation |
| --- | --- | --- | --- |
| Notification permission | One-time system prompt | Runtime permission on Android 13+; granted at install below that | Contextual pre-prompt (11.1) |
| Notification limits | 64 pending local notifications per app | No fixed limit; channels let users mute per type | Rolling 50-item window on iOS (11.3); four channels on Android |
| Notification reliability | Reliable once scheduled | Some manufacturers' battery savers delay or drop alarms | Test on Samsung and Xiaomi devices; help article on battery settings; no exact alarms |
| Background work | BGTaskScheduler; skipped after force-quit | WorkManager; may be deferred by Doze | Nothing depends on it (11.5) |
| Silent push | Content-available, heavily throttled | Data messages, normal priority | Version check on every foreground as the real mechanism |
| Secure storage | Keychain, which **survives app deletion** | Keystore, wiped on uninstall | Fresh-install check signs out leftover sessions (9.1) |
| OS backup | iCloud device backup | Auto Backup to Google Drive | Include database and receipts, exclude caches; explicit `dataExtractionRules` on Android |
| Photo access | PHPicker, no library permission | System Photo Picker, no storage permission | `expo-image-picker` in picker mode; camera permission requested only when taking a photo |
| Documents | `UIDocumentPickerViewController` | Storage Access Framework | `expo-document-picker`, copy into the app sandbox immediately |
| HEIC photos | Default camera format | Rare | Convert to JPEG on both (R-RCP-02) |
| Viewing PDFs and emails | QuickLook | Intent to the default viewer | Shared `openReceipt()` with per-platform implementation |
| Share and export | Share sheet (`UIActivityViewController`) | Android Sharesheet via a FileProvider URI | `expo-sharing` |
| Deep links | Universal Links (`apple-app-site-association`) | App Links (`assetlinks.json`, verified) | Both files hosted on the production domain |

### 15.3 Sign-in and security

| Topic | iOS | Android | Implementation |
| --- | --- | --- | --- |
| Sign in with Apple | Native sheet, Face ID | Web flow in a Custom Tab | 9.4 |
| Google | Google Sign-In SDK | Credential Manager bottom sheet | 9.4 |
| App attestation | App Attest (DeviceCheck fallback) | Play Integrity | 12.5 |
| Screen privacy | Blur overlay when backgrounded (calculator screen) | `FLAG_SECURE` (calculator screen) | 13.2 |

### 15.4 Build, release and store

| Topic | iOS | Android | Implementation |
| --- | --- | --- | --- |
| Build artefact | IPA, signed with the distribution certificate | Android App Bundle (AAB), signed with the upload key; Google re-signs | EAS Build |
| Beta testing | TestFlight (internal, then external groups) | Play internal testing, then closed testing track | Same build number across both |
| Review | App Review for every binary | Play review, usually faster | Allow 1–3 days in the release plan |
| Staged roll-out | Phased release over 7 days | Percentage roll-out (5% → 20% → 50% → 100%) | Section 19.4 |
| Store disclosure | Privacy nutrition labels, privacy manifest | Data safety form, deletion web link | Section 14 |
| Native library alignment | n/a | 16 KB memory page support required for current target levels | Checked in CI with the Android build tools' alignment check |
| Code shrinking | Bitcode not used | R8 on for release (Expo SDK 58 default) | Keep rules for any reflection-based library |

### 15.5 Device variety

Android spans far more screen sizes, memory sizes and manufacturer customisations than iOS. Design for the smallest supported screen first (a 4.7-inch iPhone SE and a 5-inch, 720p Android phone), cap content width at 640 dp on tablets and foldables, and re-layout on window size changes (foldables, split screen). Phones run portrait only; tablets allow both orientations.

## 16. Device support, performance and reliability

The app supports every OS version the chosen Expo SDK supports, and is tuned against a deliberately weak Android phone, because that is where performance problems show first.

### 16.1 Supported devices and reference lab

- **Minimum OS:** the minimum iOS and Android versions of the Expo SDK in use, recorded in `docs/support-matrix.md` at kick-off. Raising the minimum needs an ADR with usage data from the stores' dashboards.
- **Form factors:** phones (portrait), tablets and foldables (both orientations, content width capped).

| Tier | Device class (examples, final models chosen at kick-off) | Use |
| --- | --- | --- |
| Reference low-end Android | 3 GB RAM or less, entry-level chipset (e.g. a current Samsung Galaxy A0x or Redmi entry model) | Performance targets in 3.2 are measured here |
| Mainstream Android | Samsung Galaxy A5x, Google Pixel (stock Android) | Daily development and E2E |
| OEM-skin coverage | Xiaomi / Redmi, Oppo or Vivo | Notification and battery-saver behaviour |
| Oldest supported iPhone | The oldest model the iOS minimum allows, small screen (iPhone SE class) | Layout at 4.7 inches, performance |
| Current iPhone | Latest generation, Dynamic Island | Safe areas, latest OS behaviour |
| Tablet | One iPad, one Android tablet | Layout |
| Cloud device farm | Firebase Test Lab or BrowserStack, 20+ models | Release-candidate smoke tests |

### 16.2 Performance practices

- Hermes with bytecode, the New Architecture, release builds for every measurement.
- First paint does not wait for Firebase, sync or reference data. Only the database open and migrations sit before the first screen.
- Live queries select only the columns a screen needs; counts and month totals for long histories are computed with SQL aggregates where cheaper than in JS.
- Long lists use FlashList with fixed item types; no inline functions or objects passed to list items without memoisation.
- Bundled Noto Sans is subset to the Latin, Latin Extended and punctuation ranges the copy needs, plus a system fallback for names in other scripts.
- Images are thumbnailed for lists (receipt tags) and full-size only in the viewer.
- **Regression guards in CI:** Reassure render-count tests for Dashboard, Log and History; a startup-time job on the device farm that fails the build on a regression of more than 10% against the last release.

### 16.3 Reliability engineering

| Risk | Handling |
| --- | --- |
| App killed mid-save | Every write is one SQLite transaction; WAL journal; nothing half-written survives |
| Storage full | SQLite and file errors map to "Your phone is out of space. Free some space and try again." The entry stays in the form |
| Corrupted database | `PRAGMA quick_check` weekly on launch; on failure, restore the latest automatic local backup copy (taken weekly, two kept), then re-pull from the cloud if signed in |
| Migration failure | Restore the pre-migration copy (7.7) |
| Clock or time-zone change | "Today" recomputed on foreground; HLC protects ordering; notifications re-planned on time-zone change |
| 29 Feb, month ends, year ends | Covered by domain property tests with generated dates across 2020–2040 |
| Very large histories | Tested with 20,000 entries for correctness and 5,000 for the performance targets |
| Slow or flaky network | All network work is retried with back-off and never blocks the UI; request timeouts of 20 s |
| Firebase outage | App unaffected except account creation and uploads, which queue |
| Bad release | Staged roll-out, crash alerts, OTA rollback for JavaScript-only issues, forced-update gate for data-safety issues (19.5) |

## 17. Testing strategy

Business rules are proven by fast, exhaustive tests on pure functions; device behaviour is proven by end-to-end flows on real iOS and Android builds. A pull request cannot merge unless every layer below passes.

### 17.1 Test layers

| Layer | Tool | Scope | Gate |
| --- | --- | --- | --- |
| Domain unit | Jest | Every rule ID in section 10, one or more tests each | 100% branch coverage of `packages/domain` |
| Property-based | fast-check | Money sums, recurring generation, reminders across leap years, Hijri conversion, prompt rule, reconcile, sync convergence | 10,000 runs per property in CI (100 locally) |
| Hijri oracle | Jest on Node with full ICU | Every day 1356–1500 AH against `Intl` `islamic-umalqura` | Zero mismatches |
| Data integration | Jest + Drizzle on Node SQLite with the same schema and migrations | Repositories, transactions, outbox, migrations from every past version | 90% line coverage of `data/` |
| Component | React Native Testing Library | Screens and components with mocked hooks; accessibility queries (by role and label) | All screens covered |
| Security rules | `@firebase/rules-unit-testing` + emulator | Every allow and deny path for every collection and storage path | 100% of rule functions exercised |
| Functions | Jest + emulator suite | Each function's success, validation failure, idempotent retry and permission paths | All pass |
| Sync | Two simulated clients + emulator | Convergence, fault injection, clock skew (8.8) | All pass |
| End-to-end | Maestro on iOS simulator and Android emulator in CI; device farm for release candidates | The critical flows in 17.2, including airplane mode | All pass on both platforms |
| Performance | Reassure + device-farm startup job | 3.2 targets | No regression over 10% |
| Accessibility | Automated checks in component tests + manual VoiceOver and TalkBack script per release | 6.6 | Zero blockers |
| Visual | Screenshot tests of key screens at three text sizes, light theme, both platforms | Layout regressions | Reviewed diffs |

### 17.2 Critical scenarios (must pass before every release)

| ID | Scenario | Expected result |
| --- | --- | --- |
| E-01 | First open in airplane mode, log 3 entries, kill the app, go online | Entries survive; anonymous account created; entries uploaded; no duplicates |
| E-02 | Log the 5th entry | Prompt appears 1.4 s after the toast with the approved wording and correct count |
| E-03 | "Not now" at 5, then log to 15 | Second prompt at the 15th entry; never a third |
| E-04 | "Not now" at 5, then wait 14 days (clock moved) with fewer than 15 entries | Second prompt on next open or save |
| E-05 | Create account with Google, Apple, and email (three runs) | Same user ID before and after; "Account created! Your 5 donations are saved to your account." |
| E-06 | Create account while offline | "No connection, try again"; nothing lost |
| E-07 | Email already registered with 42 records; phone has 5 | Merge screen with both counts; each of the three choices gives the documented result; Cancel leaves the phone unchanged |
| E-08 | New phone, sign in to an existing account | All records, receipts (on demand) and reminders arrive |
| E-09 | Delete my account & data (guest, linked, Apple-linked) | Cloud data, receipts and login removed; Apple token revoked; app restarts clean |
| E-10 | Monthly giving, auto, day 31, started 3 months ago, back-fill Yes | Correct entries on 31 / 30 / 28 or 29 / …; opening the app twice adds nothing |
| E-11 | Same monthly rule on two offline devices, both open after the due date, then sync | Exactly one entry for that month |
| E-12 | Confirm-mode rule: "It didn't", then pause two months, resume | Declined month absent; paused months skipped; next due month appears |
| E-13 | Eid: tick a person, delete the entry from the log | Person unticked; Given total drops; budget unaffected |
| E-14 | Eid: give packets up to count, then "−" | Count limit enforced; most recent packet entry removed |
| E-15 | Budget levels: reach 79%, 80%, 100%, 101% | Correct toast for each transition, correct meter colours and messages |
| E-16 | Overseas gift in SAR, then change home country to Saudi Arabia | SAR gift now local and in totals; earlier SGD gifts shown as overseas in their own currency; budget asks for re-entry |
| E-17 | Yearly reminder on 29 Feb, non-leap year | Shown on 28 Feb, 7 days before and on the day |
| E-18 | Friday card: log something, then reopen on the same Friday | Card hidden |
| E-19 | Official Eid date published for Singapore | Device refreshes on next foreground; "expected" tag gone; notifications re-planned |
| E-20 | Hijri adjustment +1 | Islamic date and event days shift by one day where no official date exists |
| E-21 | Attach a 12 MB photo with GPS EXIF | Resized under 10 MB; no EXIF in the stored or uploaded file |
| E-22 | Export CSV with a note starting with `=SUM(` and a Malay name | Note neutralised; name displays correctly in Excel and Google Sheets |
| E-23 | Income calculator: type income, switch tab, return | Field empty; value absent from logs, crash breadcrumbs and analytics (checked in a debug log capture) |
| E-24 | VoiceOver and TalkBack: log a donation end to end | Completable without sight; every control announced correctly |
| E-25 | Largest text size, smallest phone | No clipped amounts or hidden buttons on any screen |
| E-26 | Sign out with unsent changes offline | Blocked with the documented message |

### 17.3 Test data

`packages/test-fixtures` provides typed builders (`aDonation().overseas('SA').build()`) and seeded datasets: empty, 4 entries, 5 entries, 15 entries, a realistic year (about 500 entries across currencies, rules and Eid), and a stress set of 5,000 and 20,000 entries. The same fixtures feed unit, E2E and screenshot tests, and the app's development menu can load them (development builds only).

## 18. Engineering standards

Every change is small, reviewed, tested and traceable to a requirement; the rules below are enforced by tooling wherever possible so that reviews can focus on design and correctness.

### 18.1 Code

- **TypeScript strict** (5.2). No `any`, no non-null assertions (`!`) outside tests, no `@ts-ignore` (use `@ts-expect-error` with a reason). Exhaustive `switch` on unions with a `never` check.
- **Formatting** by Prettier, **linting** by ESLint (typescript-eslint strict-type-checked, react, react-hooks, react-native, security, import order, boundaries, i18n no-literal-strings). Zero warnings policy in CI.
- **Naming:** `camelCase` for values and functions, `PascalCase` for types and components, `SCREAMING_SNAKE` for true constants, `kebab-case` file names. Booleans read as questions (`isOverseas`, `hasBudget`). Domain names follow the glossary (2.3).
- **Functions** do one thing, are pure where possible, and take an options object beyond three parameters. Data is immutable in the domain layer (`readonly` types).
- **Errors:** expected failures are `Result` values with stable codes (6.3); exceptions are for bugs. Never swallow an error silently; every `catch` logs (redacted) or rethrows.
- **Logging** only through `observability/logger`, which drops any field not on its allow-list; amounts, names, notes, emails and income can never be logged.
- **Comments** explain why, not what. Every domain function has TSDoc with its rule ID and an example. Product rules quoted from the handover are cited ("Handover: Rules — Money").
- **No dead code or commented-out code** on the main branch. Feature flags (Remote Config) carry an owner and a removal date.

### 18.2 Source control

- Trunk-based development on `main`; short-lived branches (`feat/`, `fix/`, `chore/`), merged within 2 days where possible.
- Conventional Commits (`feat(eid): tick creates log entry`), checked by commitlint. Squash-merge so `main` reads as one commit per change.
- Branch protection: required CI checks, linear history, no force-push, signed commits.
- `CODEOWNERS`: two approvals for `packages/domain`, `data/sync`, migrations, security rules, functions and anything touching auth or deletion; one approval elsewhere.
- Releases tagged `vMAJOR.MINOR.PATCH`; build numbers increase monotonically and are shared by iOS and Android.

### 18.3 Pull requests

The PR template asks for: linked requirement or rule ID, what changed and why, screenshots on iOS **and** Android for UI changes, tests added, migration or schema impact, privacy impact. Review checklist:

- [ ] Rules live in `packages/domain`, with tests named by rule ID
- [ ] Money uses `Money` and minor units; no floats; no currency mixing
- [ ] Dates are civil-date strings; no direct `new Date()` outside the clock provider
- [ ] Every write goes through a repository transaction with outbox rows
- [ ] Copy matches Appendix B; no "sync" or "back up" in UI text
- [ ] Nothing reveals salary; the income value is never persisted or logged
- [ ] Accessible: roles, labels, text scaling, touch targets
- [ ] Both platforms checked: back behaviour, safe areas, keyboard
- [ ] No new dependency without an entry in `docs/dependencies.md`

### 18.4 Dependencies

A new dependency needs: a clear need that platform or existing code cannot meet, active maintenance (a release in the last 12 months), New Architecture support, a permissive licence (MIT, Apache-2.0, BSD, ISC), no known critical vulnerabilities, and an iOS privacy manifest where it has native code. Licences are checked in CI; an SBOM (CycloneDX) is attached to every release.

### 18.5 Definition of Done

A story is done when: acceptance criteria and rule IDs pass in tests; it works offline (or degrades as documented); it is verified on one iOS and one Android device; accessibility checks pass; copy is approved; analytics and logs reviewed for privacy; docs and ADRs are updated; and it is merged to `main` behind any needed flag.

## 19. Environments, CI/CD and releases

Every build users receive is produced by CI from a tagged commit, passes the full test suite, and reaches everyone only through a staged roll-out that can be stopped.

### 19.1 Environments

| Environment | App ID (iOS bundle / Android package) | Firebase project | Distribution |
| --- | --- | --- | --- |
| Development | `sg.muslimgive.app.dev` | `muslimgive-dev` or local emulators | Development builds on developers' devices |
| Staging | `sg.muslimgive.app.staging` | `muslimgive-staging` | EAS internal distribution, TestFlight internal group |
| Production | `sg.muslimgive.app` | `muslimgive-prod` | App Store and Google Play |

The three apps install side by side, each with its own icon badge and name suffix. Environment is selected in `app.config.ts` from `APP_ENV`; no runtime switch exists in production builds. (Final identifiers depend on the domain chosen in section 22.)

### 19.2 Pipelines (GitHub Actions)

| Trigger | Jobs |
| --- | --- |
| Every pull request | Install with frozen lockfile → type-check → lint → domain and data tests with coverage gates → component tests → rules and functions tests on emulators → dependency and licence scan → Android E2E on an emulator → expo-doctor and fingerprint check |
| Nightly on `main` | iOS E2E on macOS runners, property tests at 10,000 runs, Reassure benchmarks, staging build |
| Merge to `main` | Deploy rules, indexes and functions to staging; EAS staging build or OTA update |
| Tag `v*` on a release branch | Production EAS builds, SBOM, upload source maps to Sentry, EAS Submit to TestFlight and the Play internal track |
| Manual, two approvers | Deploy backend to production; promote store builds; start or advance roll-outs |

### 19.3 Release cadence

- Before launch: a staging build at least weekly, for Isa and testers.
- After launch: a store release every 2 weeks when there are changes; hotfixes any time from a `hotfix/` branch off the release tag.
- Each release has notes in plain words, and a release checklist (store disclosures still accurate, target API level, privacy manifest, screenshots, test path for reviewers).

### 19.4 Staged roll-out

- iOS: phased release over 7 days. Android: 5% → 20% → 50% → 100%, at least 24 hours per step.
- Advance only if crash-free sessions ≥ 99.7%, no new top-5 crash, no rise in sync error rate, and no P1 support reports. Otherwise pause and fix forward.

### 19.5 Over-the-air updates (EAS Update)

- Runtime version uses the **fingerprint** policy, so an update can only reach builds with identical native code.
- Allowed by OTA: JavaScript bug fixes, copy fixes, small UI fixes. Not allowed: database migrations, new permissions, changes to what data is collected, new features that change the app's purpose (store review covers those).
- OTA updates also roll out in stages (10% → 100%) and can be rolled back to the previous update in one command.
- Updates are downloaded in the background and applied at the next cold start, never mid-session.
- `config/app.minSupportedVersion` is the emergency brake for a build that must not run (for example, a sync bug that could damage data).

## 20. Observability, operations and incident response

The team learns about problems from alerts before users report them, and it does so without ever seeing a user's donations.

### 20.1 What is collected

| Signal | Tool | Contents | Never contains |
| --- | --- | --- | --- |
| Crashes and JS errors | Sentry (`sendDefaultPii: false`, IP address not stored, no session replay) | Stack trace, app version, OS, device model, breadcrumbs of screen names and error codes | Amounts, names, notes, emails, income, receipt names, record IDs |
| Performance | Sentry traces (sampled 10%) | Startup, screen render, sync duration, query times | Same |
| Sync health | Custom counters sent with traces | Outbox length buckets (0, 1–10, 10+), error codes | Record content |
| Backend | Cloud Logging and Cloud Monitoring | Function latency, errors, rule denials, Storage and Firestore usage | Record content (functions log hashed user IDs only) |
| Product analytics | Only the approved event list (section 22) | e.g. `donation_saved` (no properties), `account_prompt_shown`, `account_created` (provider), `export_done` | Any amount, recipient, occasion, type, text field |

A `beforeSend` hook in Sentry and a unit test both assert that no event carries a field outside the allow-list.

### 20.2 Alerts

| Alert | Threshold | Goes to |
| --- | --- | --- |
| Crash-free sessions drop | < 99.5% over 1 h for the current release | Developer on call, Isa |
| New crash in the top 5 | Any | Developer on call |
| Function error rate | > 1% over 15 min | Developer on call |
| Security rule denials spike | 5× the 7-day baseline | Developer on call (possible abuse or a broken client) |
| Firestore or Storage reads/writes spike | 3× baseline | Developer on call |
| Budget | 50 / 90 / 100% of monthly budget | Both owners |
| Scheduled job failed | `exportFirestore` or `retentionSweep` failed twice in a row | Developer on call |

### 20.3 Backup and recovery

- Firestore point-in-time recovery enabled (7 days) plus daily managed exports to a separate bucket in Singapore with a 35-day lifecycle and restricted access (two owners).
- Receipts bucket with object versioning off (deletions must be real), but soft-delete retention of 7 days to recover from operator mistakes.
- A restore drill to staging runs every quarter and is recorded.
- On the phone, local weekly database copies (16.3) and the cloud replica together mean a signed-in user can always be restored.

### 20.4 Incident response

1. **Detect** (alert or report) → open an incident note with time, reporter, symptoms.
2. **Triage** severity: P1 data loss, security or privacy breach, app unusable; P2 a major feature broken; P3 everything else.
3. **Contain:** pause roll-outs, raise `minSupportedVersion`, roll back OTA, disable a feature by flag, or revoke access, as needed.
4. **Assess personal data impact.** If personal data may be affected, start the PDPA breach assessment the same day; assessments should finish quickly (PDPC expects no more than 30 days), and a notifiable breach is reported to the PDPC within 3 calendar days of the assessment (14.2).
5. **Fix and verify**, then write a blameless post-incident review within 5 working days, with actions tracked to done.

### 20.5 Runbooks (in `docs/runbooks/`)

Publishing official dates; publishing a reference list and rolling it back; restoring a user's records from tombstones at the user's request (owner approval required, logged); handling an Apple server notification failure; rotating keys; responding to a store rejection; raising the minimum supported version.

## 21. Delivery phases

The handover's four phases are kept in its order, with a foundations phase in front and a launch-hardening phase at the end, so a usable app reaches testers after phase 1 and nothing ships before the security and store work is done. Durations and budget per phase are an open decision (section 22); each phase ends at a gate, and the next starts only when the gate's criteria are met.

| Phase | Scope | Exit criteria (gate) |
| --- | --- | --- |
| 0. Foundations | Monorepo, CI pipelines, three Firebase projects in Singapore, EAS set-up, design tokens and core components, `packages/domain` ported from the prototype with tests (money, dates, Hijri table, budget, totals, recurring, reminders, Eid, prompt), SQLite schema v1 with migrations, outbox, logger, Sentry | CI green on both platforms; domain at 100% branch coverage; Hijri oracle test passing; a development build runs on one iPhone and one Android phone |
| 1. Core | Guest mode (anonymous sign-in with offline start), Welcome, Log Donation (home), Dashboard, Budget and calculator, Profile, monthly giving, sync to Firestore, security rules | E-01, E-10, E-11, E-12, E-15, E-23 pass; sync tests (8.8) pass; performance targets for startup and Dashboard met on the reference low-end Android; internal TestFlight and Play builds with Isa |
| 2. Accounts and receipts | Create free account prompt and flows (Google, Apple, email), merge flow, sign in on a new phone, sign out, receipts with upload queue, Delete my account & data, Export my data, Apple token revocation, web deletion page | E-02 to E-09, E-21, E-22, E-26 pass; rules tests 100%; deletion verified end to end in staging, including Storage and Auth |
| 3. Reminders | Local notification engine, permissions, channels, special Islamic days, yearly reminders, Friday reminder, monthly-giving confirmations with actions, background task, silent push topics | E-17, E-18, E-20 pass on both platforms, including Samsung and Xiaomi devices; iOS 64-notification limit test passes |
| 4. Eid Planner and overseas | Eid Planner (per-year plans), overseas giving and per-currency totals, country change, server-managed lists with bundled snapshots, official dates with admin console and two-person publishing (MUIS at launch) | E-13, E-14, E-16, E-19 pass; admin console reviewed for access control; reference list rollback rehearsed |
| 5. Launch hardening | External MASTG-based security assessment, accessibility audit, privacy policy and store disclosures, store listings, closed beta, load and cost review, runbooks, restore drill | No open high or critical findings; all 17.2 scenarios pass on the device farm; crash-free sessions ≥ 99.7% in beta for 2 weeks; App Review and Play review approved |

Phase 4 features already work in the prototype; they come late only because they depend on phases 1–3 (handover).

## 22. Open decisions and risks

The decisions below are Isa's to make (product) or need joint sign-off (technical with product impact). Each has a recommended default; the build proceeds on the default until a decision is recorded.

### 22.1 Decisions carried over from the handover

| # | Question | Recommended default | Needed by |
| --- | --- | --- | --- |
| D-01 | Who owns the App Store and Play accounts and pays the fees | An organisation account owned by Isa's entity (needed anyway for a D-U-N-S number and a business seller name) | Phase 0 |
| D-02 | Budget and timeline per phase; who maintains the app after launch | Agree per phase at each gate | Phase 0 |
| D-03 | Free forever, or paid features later | Free at launch; design leaves room for an optional supporter tier, never paywalling records | Phase 5 |
| D-04 | Should yearly reminders also repeat by Islamic date | Yes, in a later release; schema already allows it (10.6) | After launch |
| D-05 | Should overseas gifts count in the "All time" entry count | Yes, as the prototype does (R-TOT-04) | Phase 1 |
| D-06 | Which countries get mosque and charity lists next | Malaysia, then Brunei, driven by usage by home country | After launch |
| D-07 | Who enters official Ramadan and Eid dates each year | A named editor and reviewer pair for Singapore (MUIS) at launch | Phase 4 |
| D-08 | Keep "Masjid Aisyah / Tan'im" in the Saudi list | Keep (it is a common place to begin umrah) | Phase 4 |
| D-09 | Is the family feature coming back | Not in v1.0; it would need its own consent and privacy design | Later |

### 22.2 New decisions raised by this document

| # | Question | Recommended default | Section |
| --- | --- | --- | --- |
| D-10 | Eid Planner as one plan per year instead of one switchable plan | Yes, with "Copy people from last year" | 10.8 |
| D-11 | Allow editing past entries (prototype only deletes) | Yes | 10.1 |
| D-12 | Store official dates as month starts rather than single days | Yes | 10.9 |
| D-13 | Drop "Other country" now that every ISO country is listed | Yes | 10.10 |
| D-14 | Limit of 10 receipts per donation and 500 MB storage per user | Yes | 10.11, 12.4 |
| D-15 | Hide amounts in notifications always, names by default | Yes | 11.2 |
| D-16 | Notification times (08:00, 09:00, 10:00, 11:00) and whether users can change them | Fixed defaults at launch, one "reminder time" setting later | 11.2 |
| D-17 | Email sign-up with password, or passwordless email link | Password (as in the prototype); email link is simpler for users but adds a deep-link round trip | 9.4 |
| D-18 | Product analytics: none, or the minimal approved event list, and which processor | Minimal list via Firebase Analytics with advertising ID collection off, or no analytics at all | 20.1 |
| D-19 | Crash reporting vendor: Sentry, or Firebase Crashlytics to keep one vendor | Sentry (better JavaScript stack traces) | 5.2 |
| D-20 | Dark mode at launch | Not at launch; tokens ready | 6.5 |
| D-21 | Malay as a second language, and when | Plan for the first update after launch | 6.7 |
| D-22 | Optional app lock (Face ID, fingerprint or passcode) | Next after launch | 13.1 |
| D-23 | Guest retention: delete cloud copies of guests inactive for 365 days | Yes, disclosed in the policy | 12.2 |
| D-24 | Production domain for links, the deletion web page and the privacy policy | Register one domain at phase 0 | 14.4, 19.1 |
| D-25 | Monthly cloud budget ceiling for alerts | Set at phase 0 from staging usage | 12.1 |

### 22.3 Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Sync bug loses or duplicates records | Low | Very high | Deterministic IDs, property and chaos tests, staged roll-out, forced-update brake, server tombstones for 30 days |
| Store rejection over login or deletion rules | Medium | Medium | Checklist in 14.3 and 14.4; reviewer notes; Sign in with Apple from day one |
| Official dates entered late or wrong | Medium | Medium | "Expected" labelling until published; two-person review; ±2 day guard; rollback |
| Notifications unreliable on some Android brands | High | Low | No exact alarms needed; in-app cards are the primary surface; help article |
| Hermes `Intl` gaps on Android | Certain if relied on | Medium | In-house Hijri table (ADR-007); `Intl.NumberFormat` usage covered by tests on real devices |
| Upstream breaking changes (Expo, React Native, Firebase) | High over time | Medium | Version policy (5.1), Renovate, full E2E before upgrades |
| Cloud costs grow with receipts | Medium | Low | Image compression, quotas, budget alerts, lifecycle rules |
| A single developer becomes a bottleneck or leaves | Medium | High | This document, ADRs, runbooks, CI that encodes the rules, two code owners for critical areas |

## Appendix A. Prototype to module map

Every labelled block of `Muslim_Give_Donation_Tracker.html` has one destination. "Port" means re-implement in TypeScript with tests, using the prototype as the behavioural reference; nothing is copied verbatim.

| Prototype code | Destination | Action |
| --- | --- | --- |
| `MOSQUES`, `CHARITIES`, `OS_MOSQUES` | Server `reference/*` lists + bundled snapshot | Move to data, add stable IDs |
| `RELS`, `OCCASIONS`, `TYPES`, `BEHALF`, `AMOUNTS`, `EID_AMOUNTS` | `packages/domain/catalogue` (codes) + `i18n/en.json` (labels and explanations) | Port as codes |
| `COUNTRY_CUR`, `CURRENCIES`, `COMMON_COUNTRIES`, `COMMON_CUR` | `packages/domain/reference` generated from CLDR | Regenerate, don't hand-copy |
| `blank`, `migrate`, `lsGet`, `lsSet`, `save`, `flush`, `myDoc` | `data/db`, `data/repositories`, `data/sync` | Replace (codes remove the need for `migrate`) |
| `needAsk`, `maybeAskAccount`, `ASK_AT`, `ASK_AGAIN_AT`, `ASK_AGAIN_DAYS` | `packages/domain/account-prompt` | Port |
| `openAccount`, `finishAccount`, `accountBar` | `features/account` + `platform/auth-providers` | Replace with real linking (9.3) |
| `sum`, `isHome`, `fmt`, `money`, `fmtCur`, `SYM`, `CUR_SYM` | `packages/domain/money` + `i18n/formatters` | Port with integer minor units |
| `today`, `isoPlus`, `addM`, `dateFor`, `curYM`, `isLeap` | `packages/domain/dates` + `Clock` provider | Port |
| `relFull`, `sideUI`, `wireSide`, `relsFor`, `SIDE_RELS`, `LINE_RELS` | `packages/domain/relationship` + `ui/RelationshipPicker` | Port |
| `bStatus`, `meter`, `NEAR`, `budgetSum` | `packages/domain/budget` + `ui/Meter` | Port |
| `renderCalc` | `features/budget` | Port; income stays in component state only |
| `renderLog`, save handler, `recentTable`, `bindDeletes` | `features/log-donation`, `features/history` + `packages/domain/donation` | Port; add edit |
| `countryBox`, `wireCountryBox` | `ui/SearchableCountryPicker` | Rebuild natively |
| `renderEid`, `isEidEntry`, `gatherLogged` | `packages/domain/eid` + `features/eid-planner` | Port with per-year plans |
| `renderDash` | `packages/domain/dashboard` (`buildDashboard`) + `features/dashboard` | Port |
| `runRecurring`, `dueMonths`, `recEntry`, `createRecurring`, `pendingHTML`, `bindPending`, `recurringCard`, `bindRecurring` | `packages/domain/recurring` + `features/monthly-giving` | Port with occurrences and deterministic IDs |
| `OFFICIAL`, `HMONTHS`, `HFMT`, `hijri`, `HDAYS`, `islamicToday` | `packages/domain/hijri`, `packages/domain/islamic-days`, official-dates cache | Replace `Intl` with the table; month-start official data |
| `remLabelFor`, `addReminder`, `remindersDue`, `remindersHTML`, `bindReminders` | `packages/domain/reminders` + `features/reminders` | Port |
| `FDB`, `shrinkImage`, `storeFiles`, `openFiles`, `onFilesPicked` | `data/files` + `features/receipts` | Replace with sandbox files and upload queue |
| `fridayHTML`, `lastFridayGift`, `bindFriday` | `packages/domain/friday` + `features/dashboard` | Port |
| `openWelcome`, `renderProfile` | `features/profile` + `/modals/welcome` | Port |
| `renderFamily`, `shareSummary`, `circles`, `share` | Not built (2.2, D-09) | Remove |

## Appendix B. Approved wording

These strings come from the sign-up spec and the prototype and are used verbatim (placeholders in braces). Changing any of them needs Isa's approval.

| Where | Text |
| --- | --- |
| Account prompt title | Create a free account to keep your records |
| Account prompt body | You've logged {n} donations. Right now they're only on this phone. Create a free account so you never lose them, even if you change phones. |
| Account prompt buttons | Create free account · Not now |
| Account options | Continue with Google · Continue with Apple · Use email |
| Account options note | Everything you've logged so far stays exactly as it is. · We only keep your email and your donation records. |
| Account created | Account created! Your {n} donations are saved to your account. |
| After "Not now" | No problem. You can create an account any time under Profile. |
| Profile note (no account) | No account yet — your records are only on this phone. \[Create free account\] |
| Offline account creation | No connection, try again |
| Deletion entry point | Delete my account & data |
| Welcome | Salam! Welcome to Muslim Give · Two quick questions so the app fits you. No email needed. |
| Log screen intro | Already given? Record it here so you can look back on your giving. This app never handles money. |
| Save toast (default) | {amount} recorded. May it be accepted. |
| Friday card | Jumaah Mubarak · A good day for sadaqah. |
| Special day card | Today is {name} · A good day for sadaqah. |
| Overseas footnote | Kept in each currency, so these aren't added to your totals above. |
| Calculator note | We do not store this entry. It is merely a calculator — your income stays on this screen and is cleared as soon as you leave this page. Only a budget you choose to save is kept. |
| Giving guide note | A simple guide only. For zakat amounts and rules, check with MUIS or your mosque. |
| Monthly confirm | Did your {amount} to {recipient} go out on {date}? · Yes, log it · It didn't |
| Monthly back-fill | Add the earlier months too? |

Words that must never appear in the UI: "sync", "back up", "backup".

## Sources

Platform and policy facts in this document were checked on 27 Nov 2026 against: [Expo SDK 58 changelog](https://expo.dev/changelog/sdk-58) · [Google Play target API level requirements](https://developer.android.com/google/play/requirements/target-sdk) · [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111) · [Apple guideline 5.1.1(v) account deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion) · [Firebase anonymous authentication and automatic clean-up](https://firebase.google.com/docs/auth/web/anonymous-auth) · [Hermes Intl API notes](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md) · [PDPC: required to notify](https://www.pdpc.gov.sg/Report-Data-Breach/Before-You-Report-A-Data-Breach-3/Info) · [PDPA (Notification of Data Breaches) Regulations 2021](https://sso.agc.gov.sg/SL/PDPA2012-S64-2021). Re-check these before each phase gate; store rules change yearly.
