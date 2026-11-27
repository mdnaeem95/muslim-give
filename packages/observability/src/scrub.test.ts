import { scrubEvent } from './scrub.js';

/** Strings that must never survive scrubbing: they stand in for every kind of personal data. */
const SECRETS = [
  'S$12.50',
  '1250',
  'Aisyah Binte Karim',
  'Masjid Sultan',
  'isa@example.com',
  'for Mak birthday',
  'receipt-aisyah.jpg',
  '018f3c2e-7b1a-7c3d-9e2f-1a2b3c4d5e6f',
  '203.0.113.7',
  'https://example.com/private',
];

const valid = {
  event_id: '0123456789abcdef0123456789abcdef',
  timestamp: 1_795_000_000.5,
  platform: 'javascript',
  level: 'error',
  release: 'muslim-give@1.0.0+12',
  dist: '12',
  environment: 'production',
  exception: {
    values: [
      {
        type: 'TypeError',
        value: 'sync.push_failed',
        stacktrace: {
          frames: [
            {
              filename: 'app:///index.bundle',
              function: 'pushBatch',
              lineno: 10,
              colno: 4,
              in_app: true,
            },
          ],
        },
      },
    ],
  },
  breadcrumbs: [
    {
      category: 'navigation',
      level: 'info',
      timestamp: 1_795_000_000,
      message: 'screen.dashboard',
      data: { screen: 'dashboard' },
    },
  ],
  tags: { os: 'ios', collection: 'donations' },
  contexts: {
    os: { name: 'iOS', version: '19.1' },
    device: { model: 'iPhone15,2', family: 'iPhone' },
    app: { app_version: '1.0.0', app_build: '12' },
  },
};

const allKeys = (value: unknown, found = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    for (const entry of value as unknown[]) allKeys(entry, found);
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      found.add(key);
      allKeys(entry, found);
    }
  }
  return found;
};

describe('scrubEvent (spec 20.1): an allow-list, not a deny-list', () => {
  it('keeps a clean event intact', () => {
    expect(scrubEvent(valid)).toEqual(valid);
  });

  it('removes every field that could hold personal data', () => {
    const hostile = {
      ...valid,
      message: 'Saved S$12.50 for Aisyah Binte Karim',
      user: {
        email: 'isa@example.com',
        id: '018f3c2e-7b1a-7c3d-9e2f-1a2b3c4d5e6f',
        ip_address: '203.0.113.7',
      },
      request: { url: 'https://example.com/private', data: { amount: '1250' } },
      extra: { amount: 1250, recipient: 'Masjid Sultan', note: 'for Mak birthday' },
      server_name: 'isa@example.com',
      sdk: { name: 'sentry.javascript.react-native' },
      modules: { secret: 'S$12.50' },
      transaction: 'Aisyah Binte Karim',
      fingerprint: ['Aisyah Binte Karim'],
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Could not save S$12.50 to Masjid Sultan',
            mechanism: { data: 'isa@example.com' },
            stacktrace: {
              frames: [
                {
                  filename: 'app:///index.bundle',
                  function: 'save',
                  lineno: 1,
                  vars: { amount: '1250', name: 'Aisyah Binte Karim' },
                  context_line: 'const note = "for Mak birthday"',
                  pre_context: ['receipt-aisyah.jpg'],
                  post_context: ['018f3c2e-7b1a-7c3d-9e2f-1a2b3c4d5e6f'],
                },
              ],
            },
          },
        ],
      },
      breadcrumbs: [
        {
          category: 'ui.click',
          message: 'Aisyah Binte Karim',
          data: { name: 'Aisyah Binte Karim' },
        },
        {
          category: 'navigation',
          message: 'Opened receipt-aisyah.jpg',
          data: { screen: 'dashboard', amount: 1250, note: 'for Mak birthday', code: 'S$12.50' },
        },
      ],
      tags: { os: 'ios', recipient: 'Masjid Sultan', collection: 'isa@example.com' },
      contexts: {
        os: { name: 'iOS', version: '19.1', kernel_version: 'isa@example.com' },
        device: { model: 'isa@example.com', family: 'iPhone', name: "Isa's iPhone" },
        app: { app_version: '1.0.0', app_build: '12', app_name: 'Aisyah' },
        user_profile: { name: 'Aisyah Binte Karim' },
      },
    };
    const scrubbed = scrubEvent(hostile);
    const text = JSON.stringify(scrubbed);
    for (const secret of SECRETS) expect(text).not.toContain(secret);
    expect(text).not.toContain("Isa's iPhone");

    const allowed = new Set([
      'event_id',
      'timestamp',
      'platform',
      'level',
      'release',
      'dist',
      'environment',
      'exception',
      'values',
      'type',
      'value',
      'stacktrace',
      'frames',
      'filename',
      'function',
      'lineno',
      'colno',
      'in_app',
      'breadcrumbs',
      'category',
      'message',
      'data',
      'screen',
      'tags',
      'os',
      'contexts',
      'name',
      'version',
      'device',
      'model',
      'family',
      'app',
      'app_version',
      'app_build',
      'collection',
      'code',
    ]);
    for (const key of allKeys(scrubbed)) expect(allowed.has(key)).toBe(true);
  });

  it('keeps what is safe from a partly hostile event', () => {
    const scrubbed = scrubEvent({
      level: 'error',
      exception: { values: [{ type: 'Error', value: 'Could not save S$12.50' }] },
      breadcrumbs: [
        {
          category: 'navigation',
          message: 'Opened receipt-aisyah.jpg',
          data: { screen: 'dashboard', amount: 1250 },
        },
      ],
    });
    expect(scrubbed).toEqual({
      level: 'error',
      exception: { values: [{ type: 'Error' }] },
      breadcrumbs: [{ category: 'navigation', data: { screen: 'dashboard' } }],
    });
  });

  it('drops anything that is not an object', () => {
    for (const value of [null, undefined, 'event', 5, [], [valid]])
      expect(scrubEvent(value)).toBeNull();
  });

  it('leaves out empty parts and refuses malformed values', () => {
    expect(scrubEvent({})).toEqual({});
    expect(
      scrubEvent({
        event_id: 'not-a-uuid',
        timestamp: Number.NaN,
        platform: 'a@b.c',
        level: 'catastrophe',
        release: 'has space',
        dist: 5,
        environment: 'x'.repeat(65),
        exception: 'text',
        breadcrumbs: 'text',
        tags: 'text',
        contexts: 'text',
      }),
    ).toEqual({});
  });

  it('handles every malformed nesting without throwing', () => {
    expect(
      scrubEvent({
        exception: {
          values: [
            'x',
            null,
            5,
            {},
            { type: 'bad type!' },
            { stacktrace: 'x' },
            { stacktrace: { frames: 'x' } },
          ],
        },
      }),
    ).toEqual({});
    expect(
      scrubEvent({
        exception: {
          values: [
            {
              type: 'Error',
              stacktrace: {
                frames: [
                  'x',
                  null,
                  {},
                  { filename: 'a b', function: 'bad!' },
                  { in_app: 'yes', lineno: 'one' },
                ],
              },
            },
          ],
        },
      }),
    ).toEqual({ exception: { values: [{ type: 'Error' }] } });
    expect(
      scrubEvent({
        exception: {
          values: [{ type: 'Error', stacktrace: { frames: [{ in_app: false, colno: 3 }] } }],
        },
      }),
    ).toEqual({
      exception: {
        values: [{ type: 'Error', stacktrace: { frames: [{ in_app: false, colno: 3 }] } }],
      },
    });
    expect(
      scrubEvent({ breadcrumbs: ['x', null, {}, { category: 'ui.click' }, { category: 5 }] }),
    ).toEqual({});
    expect(scrubEvent({ breadcrumbs: [{ category: 'sync', data: 'text' }] })).toEqual({
      breadcrumbs: [{ category: 'sync' }],
    });
    expect(
      scrubEvent({
        breadcrumbs: [
          { category: 'error', level: 'warning', timestamp: 5, message: 'sync.failed' },
        ],
      }),
    ).toEqual({
      breadcrumbs: [{ category: 'error', level: 'warning', timestamp: 5, message: 'sync.failed' }],
    });
    expect(scrubEvent({ contexts: { os: 'x', device: null, app: { app_version: 5 } } })).toEqual(
      {},
    );
    expect(scrubEvent({ contexts: { os: { name: 'iOS' } } })).toEqual({
      contexts: { os: { name: 'iOS' } },
    });
  });
});
