import { err, ok, type AppError, type Result } from '../result.js';

/**
 * Hybrid logical clock timestamp, `<millis>-<counter>-<deviceId>` (spec 7.2, 8). Millis and counter
 * are zero-padded to a fixed width, so plain text comparison is time order and the server can
 * compare `_hlc` strings in security rules.
 */
export type Hlc = string & { readonly __brand: 'Hlc' };

export interface HlcState {
  readonly millis: number;
  readonly counter: number;
}

export interface HlcParts extends HlcState {
  readonly deviceId: string;
}

const MILLIS_WIDTH = 15;
const COUNTER_WIDTH = 5;
const MAX_MILLIS = 10 ** MILLIS_WIDTH - 1;
export const MAX_COUNTER = 10 ** COUNTER_WIDTH - 1;
const HLC = /^(\d{15})-(\d{5})-([A-Za-z0-9_-]{1,100})$/;
const DEVICE_ID = /^[A-Za-z0-9_-]{1,100}$/;

const invalid = (): AppError => ({ code: 'hlc.invalid' });

export function makeHlc(state: HlcState, deviceId: string): Result<Hlc, AppError> {
  const valid =
    Number.isSafeInteger(state.millis) &&
    state.millis >= 0 &&
    state.millis <= MAX_MILLIS &&
    Number.isSafeInteger(state.counter) &&
    state.counter >= 0 &&
    state.counter <= MAX_COUNTER &&
    DEVICE_ID.test(deviceId);
  if (!valid) return err(invalid());
  const millis = String(state.millis).padStart(MILLIS_WIDTH, '0');
  const counter = String(state.counter).padStart(COUNTER_WIDTH, '0');
  return ok(`${millis}-${counter}-${deviceId}` as Hlc);
}

export function parseHlc(text: string): Result<HlcParts, AppError> {
  const match = HLC.exec(text);
  const [, millis, counter, deviceId] = match ?? [];
  if (millis === undefined || counter === undefined || deviceId === undefined) {
    return err(invalid());
  }
  return ok({ millis: Number(millis), counter: Number(counter), deviceId });
}

/** -1, 0 or 1. Valid timestamps are fixed width, so this is text order. */
export function compareHlc(a: Hlc, b: Hlc): -1 | 0 | 1 {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** A remote change wins only if its timestamp is greater than the local one (spec 8.4). */
export const isNewer = (remote: Hlc, local: Hlc): boolean => compareHlc(remote, local) === 1;

/** A counter that overflows moves to the next millisecond instead of failing. */
function normalise(millis: number, counter: number): HlcState {
  return counter > MAX_COUNTER ? { millis: millis + 1, counter: 0 } : { millis, counter };
}

/** A wall clock that is not a usable number counts as 0; the logical clock carries on. */
const usableWall = (wallMillis: number): number =>
  Number.isSafeInteger(wallMillis) && wallMillis >= 0 ? wallMillis : 0;

/** The clock state for a local change. Always strictly greater than `state`. */
export function tick(state: HlcState, wallMillis: number): HlcState {
  const millis = Math.max(state.millis, usableWall(wallMillis));
  return normalise(millis, millis === state.millis ? state.counter + 1 : 0);
}

/**
 * The clock state after seeing a remote timestamp. Strictly greater than both `state` and
 * `remote`, even when the remote device's wall clock is days ahead.
 */
export function receive(state: HlcState, remote: HlcState, wallMillis: number): HlcState {
  const millis = Math.max(state.millis, remote.millis, usableWall(wallMillis));
  const fromState = millis === state.millis ? state.counter : -1;
  const fromRemote = millis === remote.millis ? remote.counter : -1;
  return normalise(millis, Math.max(fromState, fromRemote) + 1);
}
