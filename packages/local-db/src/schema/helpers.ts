import { sql, type SQL } from 'drizzle-orm';
import { integer, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

/** Columns every synced table carries (spec 7.5). Timestamps are ISO 8601 UTC instants. */
export const syncColumns = {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  hlc: text('hlc').notNull(),
  deleted: integer('deleted').notNull().default(0),
};

const quote = (value: string | number): string =>
  typeof value === 'number' ? String(value) : `'${value.replaceAll("'", "''")}'`;

/** `column IN ('a', 'b')` built from the domain vocabulary, so the database and code cannot drift. */
export const oneOf = (column: AnySQLiteColumn, values: readonly (string | number)[]): SQL =>
  sql`${column} in (${sql.raw(values.map(quote).join(', '))})`;

/** NULL or one of the values. */
export const nullOrOneOf = (column: AnySQLiteColumn, values: readonly (string | number)[]): SQL =>
  sql`(${column} is null or ${oneOf(column, values)})`;

/** NULL or text no longer than `max` characters. */
export const nullOrMaxLength = (column: AnySQLiteColumn, max: number): SQL =>
  sql`(${column} is null or length(${column}) <= ${sql.raw(String(max))})`;

/** `YYYY-MM-DD` shape; the zod and domain layers check that the date is real. */
export const civilDate = (column: AnySQLiteColumn): SQL =>
  sql`${column} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`;

export const monthKey = (column: AnySQLiteColumn): SQL =>
  sql`${column} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'`;

export const nullOrCivilDate = (column: AnySQLiteColumn): SQL =>
  sql`(${column} is null or ${civilDate(column)})`;

export const isoCode = (column: AnySQLiteColumn, length: 2 | 3): SQL =>
  sql`length(${column}) = ${sql.raw(String(length))} and ${column} = upper(${column})`;

export const flag = (column: AnySQLiteColumn): SQL => oneOf(column, [0, 1]);
