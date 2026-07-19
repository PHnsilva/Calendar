import { describe, expect, it } from 'vitest';
import { build4x4UnavailableDates, is4x4UnavailableDate } from './schedule-rules';

describe('4x4 work rotation', () => {
  it('keeps four work days available followed by four unavailable days', () => {
    const cycleStart = '2026-05-16';

    ['2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19'].forEach((date) => {
      expect(is4x4UnavailableDate(date, cycleStart)).toBe(false);
    });
    ['2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23'].forEach((date) => {
      expect(is4x4UnavailableDate(date, cycleStart)).toBe(true);
    });
    expect(is4x4UnavailableDate('2026-05-24', cycleStart)).toBe(false);
  });

  it('builds only unavailable dates for the requested month', () => {
    const dates = build4x4UnavailableDates('2026-07-01', '2026-05-16');

    expect(dates).toContain('2026-07-18');
    expect(dates).toContain('2026-07-23');
    expect(dates).not.toContain('2026-07-19');
    expect(dates.every((date) => date.startsWith('2026-07-'))).toBe(true);
  });
});
