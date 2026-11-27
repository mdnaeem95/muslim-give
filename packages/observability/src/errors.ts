import { isCode } from './fields.js';

const ERROR_NAME = /^[A-Za-z]{1,40}$/;

/**
 * A stable code for any thrown value, safe to log. Error messages are never used: they can carry
 * record content. A value with a stable `code` keeps it; an `Error` becomes `error.<name>`.
 */
export function describeError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && isCode(error.code)) {
    return error.code;
  }
  if (error instanceof Error && ERROR_NAME.test(error.name)) {
    return `error.${error.name.toLowerCase()}`;
  }
  return 'error.unknown';
}
