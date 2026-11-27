import { describeError } from './errors.js';

class SyncError extends Error {
  constructor() {
    super('Could not upload S$12.50 gift to Aisyah');
    this.name = 'SyncError';
  }
}

describe('describeError: a stable code, never the message', () => {
  it('uses a stable code carried by the error', () => {
    expect(describeError({ code: 'auth/invalid-credential' })).toBe('auth/invalid-credential');
    expect(describeError({ code: 'hlc.invalid' })).toBe('hlc.invalid');
  });
  it('falls back to the error class name, lower-cased', () => {
    expect(describeError(new TypeError('x'))).toBe('error.typeerror');
    expect(describeError(new SyncError())).toBe('error.syncerror');
  });
  it('never includes the message', () => {
    expect(describeError(new SyncError())).not.toContain('Aisyah');
    expect(describeError(new Error('isa@example.com'))).toBe('error.error');
  });
  it('ignores a code that is not a stable code', () => {
    const odd = Object.assign(new Error('x'), { code: 'Could not save Aisyah' });
    expect(describeError(odd)).toBe('error.error');
    expect(describeError({ code: 42 })).toBe('error.unknown');
  });
  it('gives unknown for anything else', () => {
    for (const value of [
      'boom',
      null,
      undefined,
      5,
      {},
      [],
      Object.assign(new Error('x'), { name: 'Bad Name 1' }),
    ]) {
      expect(describeError(value)).toBe('error.unknown');
    }
  });
});
