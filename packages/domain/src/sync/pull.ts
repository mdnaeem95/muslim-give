import { addMillis, type Instant } from '../dates/instant.js';
import { ok, type AppError, type Result } from '../result.js';
import { isNewer, parseHlc, type Hlc } from './hlc.js';

/** The overlap that catches writes committed with an earlier server time (spec 8.4). */
export const PULL_OVERLAP_MS = 60_000;

/** Where to start reading a collection: the saved cursor minus the overlap, or the beginning. */
export function pullWindowStart(cursor: Instant | null): Result<Instant | null, AppError> {
  if (cursor === null) return ok(null);
  return addMillis(cursor, -PULL_OVERLAP_MS);
}

export interface RemoteStamp {
  readonly id: string;
  readonly hlc: string;
}

export interface PullPlan {
  /** Newer than what is held locally (or not held at all): write these. */
  readonly apply: readonly string[];
  /** Not newer: the local copy wins and will push if it has not already. */
  readonly ignore: readonly string[];
  /** Timestamp is not a valid HLC: never applied, reported by code only. */
  readonly invalid: readonly string[];
}

/**
 * The apply rule of spec 8.4 for one page of remote documents. `local` maps a record ID to the
 * `hlc` held on the device. Re-applying a document that is already held is harmless: it is ignored.
 */
export function planPull(
  remote: readonly RemoteStamp[],
  local: ReadonlyMap<string, Hlc>,
): PullPlan {
  const apply: string[] = [];
  const ignore: string[] = [];
  const invalid: string[] = [];
  for (const document of remote) {
    const parsed = parseHlc(document.hlc);
    if (!parsed.ok) {
      invalid.push(document.id);
      continue;
    }
    const held = local.get(document.id);
    if (held === undefined || isNewer(document.hlc as Hlc, held)) apply.push(document.id);
    else ignore.push(document.id);
  }
  return { apply, ignore, invalid };
}
