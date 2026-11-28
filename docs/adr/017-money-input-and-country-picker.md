# ADR 017: money input and country picker (UI batch 2b)

- Status: accepted
- Date: 2026-11-28

## Context

Batch 2b of spec 6.5 is MoneyInput and the searchable country picker. The Log form (spec 10.1) and the profile (R-CTY-01) both need them. They need data (every country, and the currency each one defaults to) and a rule for what an amount box accepts.

## Decisions

1. **Country data lives in `packages/domain`**, with its search and grouping logic, so it is tested at 100% without React Native. Each country has an ISO 3166-1 code, an English name and a default ISO 4217 currency. Antarctica is left out because it has no currency; the other 248 are in. Names are the ones people use ("Turkey", "Palestine", "Brunei", "Saint Lucia"), not the formal ones.
2. **Default currencies were compiled by hand** from CLDR's currency data, and every code is checked against the currencies the Node ICU knows. They have not been checked against CLDR's data file itself, so a rare territory may be wrong. The user can always change the currency (spec 10.1). Replacing the table with a generated one belongs with the ISO 4217 table that ADR 006 already plans to generate.
3. **Search does not use `Intl` or `String.normalize`.** Their support differs between Hermes builds (the same reason dates are formatted by hand, see `format.ts`). Accents are folded with a small table, and a test checks that every country name folds to plain letters, so a new name with a new accent fails the test instead of silently not matching. Matching follows spec 10.1: names starting with the text first, then names containing it, in alphabetical order.
4. **The picker is a full sheet with its own search box.** With nothing typed it shows the Common group, then all other countries; typing shows one list of matches, and a search with no match says so. The home country is removed from the Overseas list (R-CTY-04). The sheet closes on a choice, on "Close" and on the Android back button. Each row is one button that reads "Name, currency" and says when it is selected.
5. **An amount box cleans what is typed as it is typed.** `sanitizeAmount` keeps digits and one decimal point, never more decimals than the currency has (R-MON-2), drops leading zeros, and never rounds. A comma or the Arabic decimal mark becomes a point, and Arabic-Indic and Persian digits become 0-9, since many users will have an Arabic keyboard. It keeps at most 11 whole digits so digits plus decimals always fit a safe integer. The parent therefore only ever holds text that `parseMajor` accepts; "Enter an amount" for an empty box is the form's job.
6. **The currency prefix needs no measuring.** The prototype measured the prefix to pad its text box (`fixMoney`). Here the prefix and the text input sit in one row, so layout does it, at any text size. Screen readers skip the symbol and read "Amount in Singapore dollars".
7. **Two contrast pairs added** for text on the screen background: green links and buttons, and field error text. Both are tested at AA in light and dark.
8. **The gallery's toast triggers are list rows, not chips.** They are buttons, not a choice among options, and rows stay the same width.

## Consequences

- The currency picker (with "Common currencies first") is not in this batch. It is built with the Log form and can reuse the same sheet.
- On iOS the decimal keypad has no Return key, so a person dismisses it by tapping outside the box or scrolling. Screens that hold a MoneyInput should dismiss the keyboard on scroll and on tap outside.
- Rendering, the sheet on Android (status bar and safe area inside a modal), the keyboard and VoiceOver are checked on devices, as in ADR 015.
