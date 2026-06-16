import { describe, expect, it } from 'vitest';
import { formatPhoneInput, isValidMobilePhone, normalizePhone } from './authRole';

describe('phone normalization', () => {
  it('normalizes pasted Brazilian mobile numbers with country code', () => {
    expect(normalizePhone('+55 31 99999-9999')).toBe('31999999999');
    expect(normalizePhone('5531999999999')).toBe('31999999999');
    expect(formatPhoneInput('+55 31 99999-9999')).toBe('(31) 99999-9999');
    expect(isValidMobilePhone('+55 31 99999-9999')).toBe(true);
  });

  it('does not silently transform foreign or long numbers into Brazilian mobiles', () => {
    expect(normalizePhone('+1 31999999999')).toBe('131999999999');
    expect(isValidMobilePhone('+1 31999999999')).toBe(false);
  });
});
