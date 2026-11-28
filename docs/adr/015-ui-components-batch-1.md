# ADR 015: shared UI components, batch 1

- Status: accepted
- Date: 2026-11-28

## Context

Spec 6.5 lists the shared components. They are built in two batches so each can be checked on a device before others depend on it. Batch 1 is the set the other components are made from: Card, AccentCard, Tag, Alert, ListRow, EmptyState, Chip and ChipGroup, Segmented control. Batch 2 is KPI, Meter, MoneyInput, the country picker, the charts, Toast and ConfirmButton.

## Decisions

1. **One place for rules that can be tested.** Anything that is a rule and not a layout lives in `apps/mobile/src/lib` and is tested at 100%: the alert levels (colours, icon, spoken prefix) and how a row's spoken label is put together. The components in `src/ui` only draw.
2. **Colour is never the only signal (spec 6.5).** Every alert level has its own icon and its own spoken prefix ("Heads up", "Over budget", "Done"). A test checks the three are different, and that each alert's text and background colours are a pair the WCAG test already checks in light and dark.
3. **Spoken labels can differ from the visible ones (spec 6.6).** Chips, segments and list rows accept a spoken label ("10 Singapore dollars" for "S$10"). Without one, the visible text is read.
4. **Touch size by platform.** Chips, segments and pressable rows are at least 44 pt on iOS and 48 dp on Android (`ui/touch.ts`).
5. **Text wraps, amounts never shrink.** `AppText` allows up to 200% scaling; a list row's amount does not shrink, and its title takes the remaining width and wraps.
6. **Selection is announced as a radio group.** `ChipGroup` and `Segmented` are radio groups; each option reports whether it is selected.
7. **A development-only gallery.** `app/gallery.tsx` shows every component, including a long label and a large amount, reachable from the Profile tab in development builds. Release builds redirect away from it. It is how components are checked at the largest text size before a screen uses them.
8. **Pressed states use existing colour pairs.** Pressed rows and chips use the screen background so no new contrast pair is needed; the one new pair (neutral tag text on the screen background) is in `TEXT_PAIRS`.

## Consequences

- Component rendering is checked by typecheck, lint and the gallery on a device. Component tests with React Native Testing Library arrive with the first feature, as ADR 012 said.
- Noto Sans is still not bundled; components use the system font until the font files are added.
