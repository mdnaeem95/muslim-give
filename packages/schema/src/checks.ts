import type { z } from 'zod';

/** Adds one stable-code issue at a field path, from inside a zod `.check()`. */
export function addIssue(ctx: z.core.ParsePayload, path: string, message: string): void {
  ctx.issues.push({ code: 'custom', message, input: ctx.value, path: [path] });
}
