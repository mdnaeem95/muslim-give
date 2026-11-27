# Delivery evidence

Every pull request and every phase gate leaves a written record of what was proven, so anyone can check a claim without re-running the work. This is the audit trail behind the Definition of Done (spec 18.5) and the phase gates (spec 21).

## Rules

1. **Every PR adds or updates an entry** in the current phase file (for example `phase-0.md`) before it is merged. The PR template asks for it, and a reviewer should not approve without it.
2. **Evidence is a result, not a claim.** Link the CI run, give the test and coverage numbers, and name the rule IDs that the tests prove. Numbers come from the CI job summary (the `test-evidence` step) or a pasted terminal run, never from memory.
3. **State what was not verified.** A gap written down is a finding. A gap left out is a risk.
4. **Each phase file ends with a gate checklist** copied from spec 21. A phase is closed only when every gate item links to evidence, and the phase owner signs it off in the file.
5. **Manual and device tests** (iPhone, Android, Samsung, Xiaomi, accessibility checks, TestFlight builds) are recorded the same way: device, OS version, build number, who tested, result, and a screenshot or recording link.
6. **Never edit history.** If an entry turns out to be wrong, add a dated correction below it.

## Where evidence comes from

- CI writes a "Test evidence" summary on each run and uploads the full coverage report as the `test-evidence` artifact, kept for 90 days.
- Because artifacts expire, copy the headline numbers into the entry. The numbers are the record, and the artifact is the backup.

## Entry template

Copy this under the phase file's heading for each PR.

### PR #N: short title

- Date merged:
- Requirement or rule IDs:
- CI run: link
- Tests: passed / total (suites)
- Coverage: statements, branches, functions, lines
- What the tests prove:
- Manual or device checks:
- Not verified, and why:
- Spec or docs updated:
