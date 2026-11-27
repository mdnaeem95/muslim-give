/** Expected failures are values, not exceptions (spec 6.3, 18.1). */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Stable code mapped to plain-language copy in i18n; never shown raw. */
export interface AppError {
  readonly code: string;
}
