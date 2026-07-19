import { describe, expect, it } from 'vitest';
import { toBusinessDateTimeParts } from './dates';

describe('toBusinessDateTimeParts', () => {
  it('converts backend UTC instants to the Sao Paulo appointment date and time', () => {
    expect(toBusinessDateTimeParts('2026-07-20T12:00:00Z')).toEqual({
      date: '2026-07-20',
      time: '09:00',
    });
  });

  it('preserves legacy local date-time responses without a timezone suffix', () => {
    expect(toBusinessDateTimeParts('2026-07-20T09:00:00')).toEqual({
      date: '2026-07-20',
      time: '09:00',
    });
  });
});
