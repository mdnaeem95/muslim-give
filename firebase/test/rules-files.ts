import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);

/** The rules exactly as they are deployed. */
export const firestoreRules: string = readFileSync(
  fileURLToPath(new URL('firestore.rules', root)),
  'utf8',
);
export const storageRules: string = readFileSync(
  fileURLToPath(new URL('storage.rules', root)),
  'utf8',
);
