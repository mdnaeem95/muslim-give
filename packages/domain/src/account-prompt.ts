import { elapsedDays, type Instant } from './dates/instant.js';

/** Spec 7.5 `prompt_state`: synced so a second device does not re-ask. */
export interface PromptState {
  readonly timesAsked: 0 | 1 | 2;
  readonly lastAskedAt: Instant | null;
}

export interface PromptInput {
  readonly liveEntryCount: number;
  readonly state: PromptState;
  readonly accountLinked: boolean;
  readonly now: Instant;
  /** The Welcome modal or any other modal is open. */
  readonly modalOpen: boolean;
}

/**
 * - `never`: linked, or already asked twice (the permanent Profile note shows instead)
 * - `not_yet`: a threshold has not been reached
 * - `defer`: due, but a modal is open; ask again when it closes
 * - `show`: show the prompt now
 */
export type PromptDecision = 'never' | 'not_yet' | 'defer' | 'show';

const FIRST_ASK_ENTRIES = 5;
const SECOND_ASK_ENTRIES = 15;
const SECOND_ASK_DAYS = 14;

/**
 * Rule from spec 9.2, a pure function of its inputs. If `last_asked_at` is missing after the
 * first ask (it should not be), only the entry threshold applies, so nobody is nagged by mistake.
 */
export function accountPromptDecision(input: PromptInput): PromptDecision {
  const { state } = input;
  if (input.accountLinked || state.timesAsked === 2) return 'never';
  const due =
    state.timesAsked === 0
      ? input.liveEntryCount >= FIRST_ASK_ENTRIES
      : input.liveEntryCount >= SECOND_ASK_ENTRIES ||
        (state.lastAskedAt !== null &&
          elapsedDays(state.lastAskedAt, input.now) >= SECOND_ASK_DAYS);
  if (!due) return 'not_yet';
  return input.modalOpen ? 'defer' : 'show';
}

/**
 * `times_asked` increments and `last_asked_at` is stamped when the prompt is shown, not when it
 * is answered, so killing the app cannot cause a third ask.
 */
export function markPromptShown(state: PromptState, now: Instant): PromptState {
  return { timesAsked: state.timesAsked === 0 ? 1 : 2, lastAskedAt: now };
}

/** The small Dashboard bar shows from 5 entries while no account is linked. */
export function showDashboardAccountBar(liveEntryCount: number, accountLinked: boolean): boolean {
  return !accountLinked && liveEntryCount >= FIRST_ASK_ENTRIES;
}

/** After the second ask, Profile keeps a permanent note. */
export function showPermanentProfileNote(state: PromptState, accountLinked: boolean): boolean {
  return !accountLinked && state.timesAsked === 2;
}
