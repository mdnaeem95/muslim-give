import { parseCivilDate, type CivilDate } from '@muslim-give/domain';

/** Test fixtures only; excluded from coverage. */
export const day = (text: string): CivilDate => {
  const parsed = parseCivilDate(text);
  if (!parsed.ok) throw new Error(`bad fixture: ${text}`);
  return parsed.value;
};

interface Parsed {
  readonly success: boolean;
  readonly error?: {
    readonly issues: readonly { readonly path: PropertyKey[]; readonly message: string }[];
  };
}

/** "path:code" for each issue, sorted, so tests read as a list of what went wrong. */
export function issuesOf(result: Parsed): string[] {
  if (result.success || result.error === undefined) return [];
  return result.error.issues.map((i) => `${i.path.map(String).join('.')}:${i.message}`).sort();
}
