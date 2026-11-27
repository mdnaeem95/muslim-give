import { defineConfig } from 'drizzle-kit';

/** Spec 7.7: numbered SQL migrations, generated from src/schema and checked in. */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/index.ts',
  out: './migrations',
});
