import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBusinessTodayIso, shiftIsoCalendarDate, toBusinessDateTimeParts } from './dates';

afterEach(() => vi.useRealTimers());

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

  it('uses Sao Paulo calendar boundaries even when UTC is already on the next day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T02:30:00Z'));

    const today = getBusinessTodayIso('America/Sao_Paulo');

    expect(today).toBe('2026-08-31');
    expect(shiftIsoCalendarDate(today, -29)).toBe('2026-08-02');
  });
});
