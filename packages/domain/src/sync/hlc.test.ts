import {
  compareHlc,
  isNewer,
  makeHlc,
  MAX_COUNTER,
  parseHlc,
  receive,
  tick,
  type Hlc,
  type HlcState,
} from './hlc.js';

const hlc = (millis: number, counter: number, device = 'dev-a'): Hlc => {
  const made = makeHlc({ millis, counter }, device);
  if (!made.ok) throw new Error('bad fixture');
  return made.value;
};

describe('formatting and parsing', () => {
  it('pads to a fixed width so text order is time order', () => {
    expect(hlc(5, 2)).toBe('000000000000005-00002-dev-a');
    expect(hlc(1_795_000_000_000, 0, 'abc')).toBe('001795000000000-00000-abc');
    expect(compareHlc(hlc(9, 0), hlc(10, 0))).toBe(-1);
    expect(compareHlc(hlc(10, 2), hlc(10, 10))).toBe(-1);
    expect(compareHlc(hlc(10, 10), hlc(10, 10))).toBe(0);
    expect(compareHlc(hlc(11, 0), hlc(10, 99))).toBe(1);
  });
  it('breaks a tie between devices the same way everywhere', () => {
    expect(compareHlc(hlc(10, 1, 'dev-a'), hlc(10, 1, 'dev-b'))).toBe(-1);
    expect(compareHlc(hlc(10, 1, 'dev-b'), hlc(10, 1, 'dev-a'))).toBe(1);
  });
  it('round-trips, including device IDs that contain dashes', () => {
    const parsed = parseHlc(hlc(1_795_000_000_123, 42, '018f3c2e-7b1a-7c3d'));
    expect(parsed).toEqual({
      ok: true,
      value: { millis: 1_795_000_000_123, counter: 42, deviceId: '018f3c2e-7b1a-7c3d' },
    });
  });
  it('rejects malformed text and out-of-range parts', () => {
    for (const bad of ['', '5-2-dev', '000000000000005-2-dev', '000000000000005-00002-', 'x']) {
      expect(parseHlc(bad)).toEqual({ ok: false, error: { code: 'hlc.invalid' } });
    }
    const device = 'dev';
    for (const state of [
      { millis: -1, counter: 0 },
      { millis: 1.5, counter: 0 },
      { millis: 10 ** 15, counter: 0 },
      { millis: 0, counter: -1 },
      { millis: 0, counter: MAX_COUNTER + 1 },
      { millis: 0, counter: 0.5 },
    ]) {
      expect(makeHlc(state, device).ok).toBe(false);
    }
    expect(makeHlc({ millis: 0, counter: 0 }, 'has space').ok).toBe(false);
    expect(makeHlc({ millis: 0, counter: 0 }, '').ok).toBe(false);
  });
});

describe('isNewer (spec 8.4 apply rule)', () => {
  it('is true only for a strictly greater remote timestamp', () => {
    expect(isNewer(hlc(11, 0), hlc(10, 0))).toBe(true);
    expect(isNewer(hlc(10, 0), hlc(10, 0))).toBe(false);
    expect(isNewer(hlc(9, 0), hlc(10, 0))).toBe(false);
  });
});

describe('tick: a local change', () => {
  it('follows the wall clock when it moves forward', () => {
    expect(tick({ millis: 100, counter: 7 }, 200)).toEqual({ millis: 200, counter: 0 });
  });
  it('counts up within the same millisecond', () => {
    expect(tick({ millis: 100, counter: 7 }, 100)).toEqual({ millis: 100, counter: 8 });
  });
  it('stays monotonic when the wall clock jumps backwards', () => {
    expect(tick({ millis: 100, counter: 7 }, 50)).toEqual({ millis: 100, counter: 8 });
  });
  it('moves to the next millisecond if the counter is exhausted', () => {
    expect(tick({ millis: 100, counter: MAX_COUNTER }, 100)).toEqual({ millis: 101, counter: 0 });
  });
  it('treats an unusable wall clock as zero', () => {
    for (const wall of [Number.NaN, -5, 1.5, Number.POSITIVE_INFINITY]) {
      expect(tick({ millis: 100, counter: 1 }, wall)).toEqual({ millis: 100, counter: 2 });
    }
  });
});

describe('receive: a remote timestamp', () => {
  const local: HlcState = { millis: 100, counter: 3 };
  it('follows a wall clock ahead of both', () => {
    expect(receive(local, { millis: 90, counter: 9 }, 500)).toEqual({ millis: 500, counter: 0 });
  });
  it('goes past the remote when the remote is ahead', () => {
    expect(receive(local, { millis: 300, counter: 4 }, 200)).toEqual({ millis: 300, counter: 5 });
  });
  it('goes past the local when the local is ahead', () => {
    expect(receive(local, { millis: 90, counter: 9 }, 50)).toEqual({ millis: 100, counter: 4 });
  });
  it('goes past the larger counter when all three agree', () => {
    expect(receive(local, { millis: 100, counter: 8 }, 100)).toEqual({ millis: 100, counter: 9 });
    expect(receive(local, { millis: 100, counter: 1 }, 100)).toEqual({ millis: 100, counter: 4 });
  });
  it('moves to the next millisecond if the counter is exhausted', () => {
    const remote = { millis: 100, counter: MAX_COUNTER };
    expect(receive(local, remote, 100)).toEqual({ millis: 101, counter: 0 });
  });
});

/** Small seeded generator so the simulations are repeatable on any machine. */
function seeded(seed: number): (below: number) => number {
  let state = seed;
  return (below) => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return Math.floor((state / 4_294_967_296) * below);
  };
}

interface Row {
  readonly hlc: Hlc;
  readonly value: number;
}

interface Device {
  readonly id: string;
  state: HlcState;
  skewMillis: number;
  last: Hlc | null;
}

describe('simulation: three devices, one three days fast, wall clock sometimes going backwards', () => {
  it('every stamp is greater than anything the device has seen, and no two stamps are equal', () => {
    const DAY = 86_400_000;
    for (let seed = 1; seed <= 200; seed++) {
      const next = seeded(seed);
      const devices: Device[] = [
        { id: 'dev-a', state: { millis: 0, counter: 0 }, skewMillis: 0, last: null },
        { id: 'dev-b', state: { millis: 0, counter: 0 }, skewMillis: 3 * DAY, last: null },
        { id: 'dev-c', state: { millis: 0, counter: 0 }, skewMillis: -DAY, last: null },
      ];
      const seen = new Set<string>();
      const sent: Hlc[] = [];
      let wall = 1_795_000_000_000;
      for (let step = 0; step < 60; step++) {
        wall += next(3) === 0 ? -next(5_000) : next(5_000);
        const device = devices[next(3)];
        if (device === undefined) throw new Error('unreachable');
        const clock = wall + device.skewMillis;
        const remote = sent.length > 0 && next(2) === 0 ? sent[next(sent.length)] : undefined;
        const parsed = remote === undefined ? undefined : parseHlc(remote);
        device.state =
          parsed?.ok === true
            ? receive(device.state, parsed.value, clock)
            : tick(device.state, clock);
        const made = makeHlc(device.state, device.id);
        if (!made.ok) throw new Error('bad stamp');
        expect(seen.has(made.value)).toBe(false);
        seen.add(made.value);
        if (device.last !== null) expect(isNewer(made.value, device.last)).toBe(true);
        if (remote !== undefined) expect(isNewer(made.value, remote)).toBe(true);
        device.last = made.value;
        sent.push(made.value);
      }
    }
  });
});

describe('simulation: last writer wins converges (spec 8.8)', () => {
  it('two devices that exchange everything end with identical records', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const next = seeded(seed * 7);
      const storeA = new Map<string, Row>();
      const storeB = new Map<string, Row>();
      const stores = [storeA, storeB];
      const states: HlcState[] = [
        { millis: 0, counter: 0 },
        { millis: 0, counter: 0 },
      ];
      const ids = ['dev-a', 'dev-b'];
      const skew = [0, 3 * 86_400_000];
      const apply = (store: Map<string, Row>, key: string, row: Row): void => {
        const current = store.get(key);
        if (current === undefined || isNewer(row.hlc, current.hlc)) store.set(key, row);
      };
      const log: { key: string; row: Row }[] = [];
      for (let step = 0; step < 40; step++) {
        const who = next(2);
        const store = stores[who];
        const stateBefore = states[who];
        const id = ids[who];
        const offset = skew[who];
        if (
          store === undefined ||
          stateBefore === undefined ||
          id === undefined ||
          offset === undefined
        ) {
          throw new Error('unreachable');
        }
        const state = tick(stateBefore, 1_795_000_000_000 + step * 10 + offset);
        states[who] = state;
        const made = makeHlc(state, id);
        if (!made.ok) throw new Error('bad stamp');
        const row = { hlc: made.value, value: next(1000) };
        const key = `k${String(next(4))}`;
        apply(store, key, row);
        log.push({ key, row });
      }
      // Deliver every change to both devices, in different orders.
      for (const { key, row } of log) apply(storeA, key, row);
      for (const { key, row } of [...log].reverse()) apply(storeB, key, row);
      const byKey = (store: Map<string, Row>): [string, Row][] =>
        [...store.entries()].sort(([a], [b]) => a.localeCompare(b));
      expect(byKey(storeA)).toEqual(byKey(storeB));
    }
  });
});
