import { inst } from '../test-support.js';
import { makeHlc, type Hlc } from './hlc.js';
import { planPull, pullWindowStart, PULL_OVERLAP_MS } from './pull.js';

const hlc = (millis: number, counter = 0, device = 'dev-a'): Hlc => {
  const made = makeHlc({ millis, counter }, device);
  if (!made.ok) throw new Error('bad fixture');
  return made.value;
};

describe('pullWindowStart (spec 8.4)', () => {
  it('starts from the beginning when there is no cursor', () => {
    expect(pullWindowStart(null)).toEqual({ ok: true, value: null });
  });
  it('re-reads the last 60 seconds before the cursor', () => {
    expect(PULL_OVERLAP_MS).toBe(60_000);
    expect(pullWindowStart(inst('2027-03-05T00:01:00.000Z'))).toEqual({
      ok: true,
      value: '2027-03-05T00:00:00.000Z',
    });
  });
  it('reports an error when the cursor is too close to the start of supported dates', () => {
    expect(pullWindowStart(inst('0000-01-01T00:00:00.000Z'))).toEqual({
      ok: false,
      error: { code: 'date.invalid' },
    });
  });
});

describe('planPull: the apply rule', () => {
  const local = new Map<string, Hlc>([
    ['same', hlc(10)],
    ['older-here', hlc(10)],
    ['newer-here', hlc(20)],
  ]);
  it('applies records that are new or newer, ignores the rest', () => {
    const plan = planPull(
      [
        { id: 'brand-new', hlc: hlc(5) },
        { id: 'same', hlc: hlc(10) },
        { id: 'older-here', hlc: hlc(11) },
        { id: 'newer-here', hlc: hlc(19) },
      ],
      local,
    );
    expect(plan).toEqual({
      apply: ['brand-new', 'older-here'],
      ignore: ['same', 'newer-here'],
      invalid: [],
    });
  });
  it('breaks a same-time tie by device, the same way on every device', () => {
    const held = new Map<string, Hlc>([['x', hlc(10, 1, 'dev-a')]]);
    expect(planPull([{ id: 'x', hlc: hlc(10, 1, 'dev-b') }], held).apply).toEqual(['x']);
    expect(planPull([{ id: 'x', hlc: hlc(10, 1, 'dev-a') }], held).ignore).toEqual(['x']);
  });
  it('never applies a document with an invalid timestamp, and does not stop on it', () => {
    const plan = planPull(
      [
        { id: 'bad', hlc: 'tomorrow' },
        { id: 'good', hlc: hlc(30) },
      ],
      local,
    );
    expect(plan).toEqual({ apply: ['good'], ignore: [], invalid: ['bad'] });
  });
  it('is harmless to plan the same page twice after applying it', () => {
    const page = [{ id: 'a', hlc: hlc(5) }];
    const held = new Map<string, Hlc>();
    for (const id of planPull(page, held).apply) held.set(id, hlc(5));
    expect(planPull(page, held)).toEqual({ apply: [], ignore: ['a'], invalid: [] });
  });
});
