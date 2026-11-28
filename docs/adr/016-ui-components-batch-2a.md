# ADR 016: shared UI components, batch 2a

- Status: accepted
- Date: 2026-11-28

## Context

Batch 2 of spec 6.5 is split in two. Batch 2a is KPI, Meter, Toast, ConfirmButton, BarChart and ColumnChart. Batch 2b is MoneyInput and the country picker, which need currency and country data and a design for measuring the currency prefix.

## Decisions

1. **Charts are drawn with plain Views, not `react-native-svg`.** Spec 5.2 names SVG, but the prototype's charts are only horizontal bars and columns. Views draw them exactly, scale with layout, and avoid a native dependency and an install step. If a later chart needs curves or axes, SVG is added then.
2. **Every chart has a text alternative and a list view (spec 6.6).** Each bar is read aloud as label, value and share ("Mosque, 320 Singapore dollars, 40% of the total"); the column chart is read as one element in order; and "View as list" shows the same figures as rows. The sizes and shares come from a tested function (`chartModel`).
3. **The meter always shows a percentage and an icon (spec 6.5).** Colours follow R-BUD-03: green for ok and done, amber for near, red for over, where the bar shows the budget share green and the excess red. The bar uses flex weights instead of percentage strings, so it needs no string maths. It does not animate, which also honours Reduce Motion.
4. **Toasts are announced, last long enough to read, and appear at the top.** A toast is announced to screen readers when it appears (explicitly on iOS, through a live region on Android) and lasts four seconds plus time for any text beyond a short line, up to ten. It sits below the status bar so it never covers the tab bar or the keyboard. Screens must still show the result in context. The tested duration function and the colour pairs are in `src/lib/toast.ts`; one new contrast pair (default toast) is in `TEXT_PAIRS`.
5. **ConfirmButton uses the platform dialog.** `Alert.alert` with a cancel button and a destructive confirm button, replacing the prototype's tap-again-to-delete.
6. **Bar labels sit above their bars.** The prototype puts the label, bar and value on one line; at 200% text that squeezes the bar. Stacking them keeps long labels wrapping and values whole.

## Consequences

- Rendering is checked by typecheck, lint and the gallery on a device, as in ADR 015.
- Where a chart row's spoken value differs from its visible one, the caller provides it (`spokenValue`), as for chips and list rows.
