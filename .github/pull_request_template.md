## Requirement / rule ID

## What changed and why

## Tests added

## Screenshots (iOS and Android, for UI changes)

## Migration or schema impact

## Privacy impact

- [ ] Rules live in `packages/domain`, with tests named by rule ID
- [ ] Money uses `Money` and minor units; no floats; no currency mixing
- [ ] Dates are civil-date strings; no direct `new Date()` outside the clock provider
- [ ] Every write goes through a repository transaction with outbox rows
- [ ] Copy matches Appendix B; no "sync" or "back up" in UI text
- [ ] Nothing reveals salary; the income value is never persisted or logged
- [ ] Accessible: roles, labels, text scaling, touch targets
- [ ] Both platforms checked: back behaviour, safe areas, keyboard
- [ ] No new dependency without an entry in `docs/dependencies.md`
