# ADR 014: tabs without a top bar, platform icons

- Status: accepted
- Date: 2026-11-28

## Context

The first simulator run (PR #13 build) showed two problems. At the largest system text size the top bar's title was cut off, because the bar keeps a fixed height while its text scales; and every tab showed a placeholder shape instead of an icon. Spec 6.6 requires text to scale to 200% without loss, and 6.4 asks for platform-appropriate tabs.

## Decisions

1. **No top bar on the five tabs.** Each screen shows its own heading as scalable text, so nothing is clipped and the "Dashboard" / "Today" duplicate goes away. `Screen` adds the safe-area top inset itself, on both platforms.
2. **Platform icon sets.** iOS shows SF Symbols and Android shows Material Symbols, both through `expo-symbols`, chosen per tab in `src/lib/tabs.ts`. A test checks that every tab has its copy and a distinct icon on each platform.
3. **Still the JavaScript tab bar.** Expo's documentation no longer lists native tabs as unstable in SDK 58 (the import moved to `expo-router/native-tabs`), but it documents no accessibility labels for them. The switch is deferred until that is confirmed on a device, and would change one layout file.

## Consequences

- Tab labels in the bar do not grow with the text size in the first simulator run. This is left as it is until it is judged on a real device, since bottom bars commonly stay fixed.
- Dark mode is still not offered (spec 6.5, `userInterfaceStyle: light`).
