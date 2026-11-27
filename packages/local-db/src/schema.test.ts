import {
  CATEGORIES,
  DONATION_SOURCES,
  GIVING_TYPES,
  OCCASIONS,
  ON_BEHALF,
  RELATIONSHIPS,
} from '@muslim-give/domain';
import { getTableName, is } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import * as schema from './schema/index.js';
import {
  donationRow,
  failureOf,
  insert,
  openMigratedDb,
  ruleRow,
  syncRow,
  type TestDb,
} from './test-support.js';

let db: TestDb;
beforeEach(() => {
  db = openMigratedDb();
});

const rejects = (
  table: string,
  row: Record<string, string | number | null>,
  constraint: string,
): void => {
  expect(failureOf(() => insert(db, table, row))).toContain(constraint);
};

const count = (table: string): number =>
  Number(db.prepare(`select count(*) as n from "${table}"`).all()[0]?.['n']);

describe('migrations', () => {
  it('create exactly the tables the Drizzle schema defines', () => {
    const defined = Object.values(schema)
      .filter((value) => is(value, SQLiteTable))
      .map((table) => getTableName(table))
      .sort();
    const created = db
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
      .all()
      .map((row) => String(row['name']))
      .sort();
    expect(created).toEqual(defined);
  });
  it('create every table in spec 7.5', () => {
    const names = db
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
      .all()
      .map((row) => String(row['name']))
      .sort();
    expect(names).toEqual(
      [
        'budget',
        'device',
        'donations',
        'eid_packet_groups',
        'eid_people',
        'eid_plans',
        'notification_schedule',
        'official_dates_cache',
        'outbox',
        'profile',
        'prompt_state',
        'receipts',
        'recurring_occurrences',
        'recurring_rules',
        'ref_cache',
        'reminders',
        'sync_state',
      ].sort(),
    );
  });
});

describe('donations: the database refuses what the domain refuses', () => {
  it('accepts a valid individual gift', () => {
    insert(db, 'donations', donationRow('d1'));
    expect(count('donations')).toBe(1);
  });
  it('requires a positive integer-style amount, ISO codes and a civil date', () => {
    rejects('donations', donationRow('d', { amount_minor: 0 }), 'donations_amount');
    rejects('donations', donationRow('d', { amount_minor: -5 }), 'donations_amount');
    rejects('donations', donationRow('d', { currency: 'sgd' }), 'donations_currency');
    rejects('donations', donationRow('d', { country_code: 'SGP' }), 'donations_country');
    rejects('donations', donationRow('d', { date: '5 March 2027' }), 'donations_date');
    rejects('donations', donationRow('d', { deleted: 2 }), 'donations_deleted');
  });
  it('refuses a missing country (every record states its own, spec 7)', () => {
    rejects('donations', donationRow('d', { country_code: null }), 'NOT NULL');
  });
  it('needs a name for mosques and charities, and keeps relationships for individuals', () => {
    const mosque = { category: 'mosque', relationship: null };
    insert(db, 'donations', donationRow('m1', { ...mosque, recipient_name: 'Masjid Sultan' }));
    rejects(
      'donations',
      donationRow('m2', { ...mosque, recipient_name: null }),
      'donations_recipient_rules',
    );
    rejects(
      'donations',
      donationRow('m3', { ...mosque, recipient_name: '' }),
      'donations_recipient_rules',
    );
    rejects(
      'donations',
      donationRow('m4', { category: 'charity', recipient_name: 'Jamiyah' }),
      'donations_recipient_rules',
    );
    insert(db, 'donations', donationRow('i1', { recipient_name: null }));
    rejects(
      'donations',
      donationRow('i2', { recipient_name: 'a'.repeat(81) }),
      'donations_recipient_len',
    );
  });
  it('limits free text', () => {
    rejects('donations', donationRow('d', { note: 'a'.repeat(121) }), 'donations_note_len');
    rejects(
      'donations',
      donationRow('d', { occasion: 'other', occasion_other: 'a'.repeat(61) }),
      'donations_occasion_other_len',
    );
  });
  it('allows free-text occasion only for Others, and a name only for on-behalf Others', () => {
    insert(
      db,
      'donations',
      donationRow('o1', { occasion: 'other', occasion_other: 'School fundraiser' }),
    );
    rejects(
      'donations',
      donationRow('o2', { occasion_other: 'x' }),
      'donations_occasion_other_rule',
    );
    insert(
      db,
      'donations',
      donationRow('b1', { on_behalf: 'other', on_behalf_name: 'Arwah Tok Wan' }),
    );
    rejects(
      'donations',
      donationRow('b2', { on_behalf: 'other' }),
      'donations_on_behalf_name_rule',
    );
    rejects(
      'donations',
      donationRow('b3', { on_behalf_name: 'x' }),
      'donations_on_behalf_name_rule',
    );
  });
  it('sets the monthly-giving rule and month together, once per month', () => {
    insert(db, 'recurring_rules', ruleRow('r1'));
    const link = { source: 'recurring', recurring_rule_id: 'r1', occurrence_month: '2027-03' };
    insert(db, 'donations', donationRow('don_occ_r1_2027-03', link));
    rejects(
      'donations',
      donationRow('x', { recurring_rule_id: 'r1' }),
      'donations_occurrence_pair',
    );
    expect(failureOf(() => insert(db, 'donations', donationRow('dup', link)))).toContain('UNIQUE');
    insert(db, 'donations', donationRow('ok', { ...link, occurrence_month: '2027-04' }));
  });
  it('allows many gifts without a rule', () => {
    insert(db, 'donations', donationRow('a'));
    insert(db, 'donations', donationRow('b'));
    expect(count('donations')).toBe(2);
  });
});

describe('vocabulary cannot drift from the domain codes', () => {
  it('accepts every code the domain defines', () => {
    let n = 0;
    const id = (): string => `v${String(n++)}`;
    for (const category of CATEGORIES) {
      const mosque =
        category === 'individual' ? {} : { relationship: null, recipient_name: 'Name' };
      insert(db, 'donations', donationRow(id(), { category, ...mosque }));
    }
    for (const relationship of RELATIONSHIPS) {
      insert(db, 'donations', donationRow(id(), { relationship }));
    }
    for (const occasion of OCCASIONS) insert(db, 'donations', donationRow(id(), { occasion }));
    for (const givingType of GIVING_TYPES) {
      insert(db, 'donations', donationRow(id(), { giving_type: givingType }));
    }
    for (const onBehalf of ON_BEHALF) {
      const name = onBehalf === 'other' ? { on_behalf_name: 'Name' } : {};
      insert(db, 'donations', donationRow(id(), { on_behalf: onBehalf, ...name }));
    }
    for (const source of DONATION_SOURCES) insert(db, 'donations', donationRow(id(), { source }));
    expect(count('donations')).toBe(n);
  });
  it('rejects a code the domain does not define', () => {
    rejects('donations', donationRow('d', { occasion: 'Eid al-Fitr' }), 'donations_occasion');
    rejects(
      'donations',
      donationRow('d', { relationship: 'Uncle (maternal)' }),
      'donations_relationship',
    );
    rejects('donations', donationRow('d', { source: 'import' }), 'donations_source');
  });
});

describe('receipts', () => {
  const receipt = (over: Record<string, string | number | null> = {}) => ({
    ...syncRow('rc1'),
    donation_id: 'd1',
    file_name: 'receipt.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 1000,
    sha256: 'a'.repeat(64),
    ...over,
  });
  it('belongs to a donation and respects the limits in R-RCP', () => {
    rejects('receipts', receipt(), 'FOREIGN KEY');
    insert(db, 'donations', donationRow('d1'));
    insert(db, 'receipts', receipt());
    rejects('receipts', receipt({ id: 'r2', size_bytes: 10 * 1024 * 1024 + 1 }), 'receipts_size');
    rejects('receipts', receipt({ id: 'r3', file_name: 'a'.repeat(101) }), 'receipts_file_name');
    rejects('receipts', receipt({ id: 'r4', sha256: 'abc' }), 'receipts_sha256');
    rejects('receipts', receipt({ id: 'r5', upload_state: 'gone' }), 'receipts_upload_state');
  });
});

describe('monthly giving (R-REC)', () => {
  it('accepts a valid rule and refuses bad days, modes and Friday prayer', () => {
    insert(db, 'recurring_rules', ruleRow('r1'));
    rejects('recurring_rules', ruleRow('r2', { day_of_month: 0 }), 'rules_day');
    rejects('recurring_rules', ruleRow('r3', { day_of_month: 32 }), 'rules_day');
    rejects('recurring_rules', ruleRow('r4', { mode: 'sometimes' }), 'rules_mode');
    rejects('recurring_rules', ruleRow('r5', { status: 'gone' }), 'rules_status');
    rejects('recurring_rules', ruleRow('r6', { occasion: 'friday_prayer' }), 'rules_no_friday');
    rejects('recurring_rules', ruleRow('r7', { start_month: '2027-1' }), 'rules_start_month');
    rejects('recurring_rules', ruleRow('r8', { recipient_name: null }), 'rules_recipient_rules');
  });
  it('has one occurrence per rule per month', () => {
    insert(db, 'recurring_rules', ruleRow('r1'));
    const occurrence = (id: string, over: Record<string, string | number | null> = {}) => ({
      ...syncRow(id),
      rule_id: 'r1',
      month: '2027-03',
      due_date: '2027-03-31',
      status: 'pending',
      amount_minor: 5000,
      currency: 'SGD',
      ...over,
    });
    insert(db, 'recurring_occurrences', occurrence('occ_r1_2027-03'));
    expect(failureOf(() => insert(db, 'recurring_occurrences', occurrence('again')))).toContain(
      'UNIQUE',
    );
    insert(db, 'recurring_occurrences', occurrence('occ_r1_2027-04', { month: '2027-04' }));
    rejects(
      'recurring_occurrences',
      occurrence('x', { month: '2027-05', status: 'done' }),
      'occurrences_status',
    );
    rejects(
      'recurring_occurrences',
      occurrence('y', { rule_id: 'nope', month: '2027-06' }),
      'FOREIGN KEY',
    );
  });
});

describe('yearly reminders (R-YR)', () => {
  const reminder = (id: string, over: Record<string, string | number | null> = {}) => ({
    ...syncRow(id),
    label: "Mak's birthday",
    month_day: '02-29',
    occasion: 'birthday',
    category: 'individual',
    recipient_name: 'Mak',
    relationship: 'mother',
    ...over,
  });
  it('stores a month-day including 29 February', () => {
    insert(db, 'reminders', reminder('y1'));
    rejects('reminders', reminder('y2', { label: 'a'.repeat(41) }), 'reminders_label');
    rejects('reminders', reminder('y3', { label: '' }), 'reminders_label');
    rejects('reminders', reminder('y4', { month_day: '2-29' }), 'reminders_month_day');
    rejects('reminders', reminder('y5', { last_amount_minor: 0 }), 'reminders_last_amount');
    rejects('reminders', reminder('y6', { last_currency: 'sg' }), 'reminders_last_currency');
    insert(
      db,
      'reminders',
      reminder('y7', { last_amount_minor: 100, last_currency: 'SGD', last_date: '2027-02-28' }),
    );
  });
});

describe('Eid Planner (R-EID)', () => {
  const plan = (id: string, year: number) => ({
    ...syncRow(id),
    year,
    budget_minor: 30000,
    currency: 'SGD',
  });
  it('has one plan per year', () => {
    insert(db, 'eid_plans', plan('p1', 2027));
    expect(failureOf(() => insert(db, 'eid_plans', plan('p2', 2027)))).toContain('UNIQUE');
    insert(db, 'eid_plans', plan('p3', 2028));
    rejects('eid_plans', plan('p4', 1899), 'eid_plans_year');
    rejects('eid_plans', { ...plan('p5', 2029), budget_minor: -1 }, 'eid_plans_budget');
  });
  it('holds named people, never Stranger', () => {
    insert(db, 'eid_plans', plan('p1', 2027));
    const person = (id: string, over: Record<string, string | number | null> = {}) => ({
      ...syncRow(id),
      plan_id: 'p1',
      name: 'Aiman',
      relationship: 'nephew',
      group: 'kids',
      amount_minor: 1000,
      ...over,
    });
    insert(db, 'eid_people', person('e1'));
    rejects('eid_people', person('e2', { relationship: 'stranger' }), 'eid_people_relationship');
    rejects('eid_people', person('e3', { group: 'strangers' }), 'eid_people_group');
    rejects('eid_people', person('e4', { name: '' }), 'eid_people_name');
    rejects('eid_people', person('e5', { plan_id: 'nope' }), 'FOREIGN KEY');
  });
  it('keeps packet counts between 0 and 999, one row per group', () => {
    insert(db, 'eid_plans', plan('p1', 2027));
    const group = (id: string, over: Record<string, string | number | null> = {}) => ({
      ...syncRow(id),
      plan_id: 'p1',
      group_key: 'kids',
      count: 3,
      amount_each_minor: 200,
      ...over,
    });
    insert(db, 'eid_packet_groups', group('g1'));
    expect(failureOf(() => insert(db, 'eid_packet_groups', group('g2')))).toContain('UNIQUE');
    insert(db, 'eid_packet_groups', group('g3', { group_key: 'elderly', count: 999 }));
    rejects('eid_packet_groups', group('g4', { group_key: 'others' }), 'eid_packets_group');
    const other = { ...plan('p2', 2028) };
    insert(db, 'eid_plans', other);
    rejects('eid_packet_groups', group('g5', { plan_id: 'p2', count: 1000 }), 'eid_packets_count');
    rejects('eid_packet_groups', group('g6', { plan_id: 'p2', count: -1 }), 'eid_packets_count');
  });
});

describe('singletons', () => {
  const profile = (over: Record<string, string | number | null> = {}) => ({
    ...syncRow('profile'),
    home_country_code: 'SG',
    home_currency: 'SGD',
    ...over,
  });
  it('allow exactly the fixed id', () => {
    insert(db, 'profile', profile());
    expect(failureOf(() => insert(db, 'profile', profile({ id: 'second' })))).toContain(
      'profile_singleton',
    );
    insert(db, 'budget', { ...syncRow('budget'), monthly_amount_minor: 0, currency: 'SGD' });
    rejects(
      'budget',
      { ...syncRow('other'), monthly_amount_minor: 0, currency: 'SGD' },
      'budget_singleton',
    );
    insert(db, 'prompt_state', { ...syncRow('prompt_state') });
    rejects('prompt_state', { ...syncRow('x') }, 'prompt_singleton');
  });
  it('applies the profile and prompt limits', () => {
    const fresh = (over: Record<string, string | number | null>) => {
      db = openMigratedDb();
      rejects(
        'profile',
        profile(over),
        Object.keys(over)[0] === 'name' ? 'profile_name' : 'profile_',
      );
    };
    fresh({ name: 'a'.repeat(31) });
    fresh({ hijri_adjust: 2 });
    fresh({ marital_status: 'divorced' });
    fresh({ friday_reminder: 2 });
    insert(db, 'profile', profile({ marital_status: null, hijri_adjust: -1 }));
    rejects(
      'budget',
      { ...syncRow('budget'), monthly_amount_minor: -1, currency: 'SGD' },
      'budget_amount',
    );
    rejects('prompt_state', { ...syncRow('prompt_state'), times_asked: 3 }, 'prompt_times');
  });
  it('defaults the profile to a guest-friendly state', () => {
    insert(db, 'profile', profile());
    const row = db.prepare('select * from profile').all()[0];
    expect(row?.['friday_reminder']).toBe(0);
    expect(row?.['welcome_seen']).toBe(0);
    expect(row?.['hijri_adjust']).toBe(0);
    expect(row?.['name']).toBe('');
  });
});

describe('local-only tables', () => {
  it('number outbox rows and refuse unknown operations', () => {
    const entry = (op: string) => ({
      collection: 'donations',
      record_id: 'd1',
      op,
      hlc: '1-0-device',
      payload: '{}',
    });
    insert(db, 'outbox', entry('upsert'));
    insert(db, 'outbox', entry('delete'));
    expect(
      db
        .prepare('select seq from outbox order by seq')
        .all()
        .map((r) => r['seq']),
    ).toEqual([1, 2]);
    rejects('outbox', entry('merge'), 'outbox_op');
  });
  it('keep one device row', () => {
    insert(db, 'device', { id: 'device', install_id: 'abc' });
    rejects('device', { id: 'other', install_id: 'abc' }, 'device_singleton');
  });
});
