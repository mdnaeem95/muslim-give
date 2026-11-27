import { createClock } from './clock.js';

describe('createClock', () => {
  it('turns the device day into a civil date', () => {
    expect(createClock(() => ({ year: 2027, month: 3, day: 5 })).today()).toBe('2027-03-05');
  });
  it('reads the day each time, so it follows midnight', () => {
    let day = 5;
    const clock = createClock(() => ({ year: 2027, month: 3, day }));
    expect(clock.today()).toBe('2027-03-05');
    day = 6;
    expect(clock.today()).toBe('2027-03-06');
  });
  it('pads single digits', () => {
    expect(createClock(() => ({ year: 2027, month: 1, day: 9 })).today()).toBe('2027-01-09');
  });
});
