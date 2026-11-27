import { inst } from './test-support.js';
import {
  accountPromptDecision,
  markPromptShown,
  showDashboardAccountBar,
  showPermanentProfileNote,
  type PromptInput,
  type PromptState,
} from './account-prompt.js';

const now = inst('2027-03-10T00:00:00.000Z');
const fresh: PromptState = { timesAsked: 0, lastAskedAt: null };
const askedOnce = (at: string): PromptState => ({ timesAsked: 1, lastAskedAt: inst(at) });
const input = (overrides: Partial<PromptInput>): PromptInput => ({
  liveEntryCount: 0,
  state: fresh,
  accountLinked: false,
  now,
  modalOpen: false,
  ...overrides,
});

describe('spec 9.2 account prompt', () => {
  it('never prompts a linked account or after two asks', () => {
    expect(accountPromptDecision(input({ liveEntryCount: 50, accountLinked: true }))).toBe('never');
    expect(
      accountPromptDecision(
        input({ liveEntryCount: 50, state: { timesAsked: 2, lastAskedAt: now } }),
      ),
    ).toBe('never');
  });
  it('asks the first time at 5 live entries', () => {
    expect(accountPromptDecision(input({ liveEntryCount: 4 }))).toBe('not_yet');
    expect(accountPromptDecision(input({ liveEntryCount: 5 }))).toBe('show');
  });
  it('defers while a modal is open', () => {
    expect(accountPromptDecision(input({ liveEntryCount: 5, modalOpen: true }))).toBe('defer');
    expect(
      accountPromptDecision(
        input({
          liveEntryCount: 15,
          state: askedOnce('2027-03-09T00:00:00.000Z'),
          modalOpen: true,
        }),
      ),
    ).toBe('defer');
  });
  it('asks the second and final time at 15 entries or 14 days', () => {
    const recent = askedOnce('2027-03-01T00:00:00.000Z');
    expect(accountPromptDecision(input({ liveEntryCount: 14, state: recent }))).toBe('not_yet');
    expect(accountPromptDecision(input({ liveEntryCount: 15, state: recent }))).toBe('show');
    const fortnight = askedOnce('2027-02-24T00:00:00.000Z');
    expect(accountPromptDecision(input({ liveEntryCount: 6, state: fortnight }))).toBe('show');
    const thirteen = askedOnce('2027-02-25T00:00:00.000Z');
    expect(accountPromptDecision(input({ liveEntryCount: 6, state: thirteen }))).toBe('not_yet');
  });
  it('relies on the entry count alone if the last-asked time is missing', () => {
    const broken: PromptState = { timesAsked: 1, lastAskedAt: null };
    expect(accountPromptDecision(input({ liveEntryCount: 14, state: broken }))).toBe('not_yet');
    expect(accountPromptDecision(input({ liveEntryCount: 15, state: broken }))).toBe('show');
  });
  it('stamps the ask when the prompt is shown', () => {
    expect(markPromptShown(fresh, now)).toEqual({ timesAsked: 1, lastAskedAt: now });
    expect(markPromptShown(askedOnce('2027-03-01T00:00:00.000Z'), now)).toEqual({
      timesAsked: 2,
      lastAskedAt: now,
    });
  });
  it('shows the Dashboard bar from 5 entries without an account', () => {
    expect(showDashboardAccountBar(5, false)).toBe(true);
    expect(showDashboardAccountBar(4, false)).toBe(false);
    expect(showDashboardAccountBar(5, true)).toBe(false);
  });
  it('keeps a permanent Profile note after the second ask', () => {
    expect(showPermanentProfileNote({ timesAsked: 2, lastAskedAt: now }, false)).toBe(true);
    expect(showPermanentProfileNote(askedOnce('2027-03-01T00:00:00.000Z'), false)).toBe(false);
    expect(showPermanentProfileNote({ timesAsked: 2, lastAskedAt: now }, true)).toBe(false);
  });
});
