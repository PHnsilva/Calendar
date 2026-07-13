import { describe, expect, it } from 'vitest';
import { formatPhoneInput, isOwnerAdminPhone, isValidMobilePhone, normalizePhone } from './authRole';

describe('phone normalization', () => {
  it('normalizes pasted Brazilian mobile numbers with country code', () => {
    expect(normalizePhone('+55 31 99999-9999')).toBe('31999999999');
    expect(normalizePhone('5531999999999')).toBe('31999999999');
    expect(formatPhoneInput('+55 31 99999-9999')).toBe('(31) 99999-9999');
    expect(isValidMobilePhone('+55 31 99999-9999')).toBe(true);
  });

  it('recognizes the owner admin phone across accepted formats', () => {
    expect(isOwnerAdminPhone('31995438467')).toBe(true);
    expect(isOwnerAdminPhone('(31) 99543-8467')).toBe(true);
    expect(isOwnerAdminPhone('+5531995438467')).toBe(true);
    expect(isOwnerAdminPhone('5531995438467')).toBe(true);
  });

  it('formats 10-digit landlines without forcing a mobile mask', () => {
    expect(formatPhoneInput('3133334444')).toBe('(31) 3333-4444');
  });

  it('does not silently transform foreign or long numbers into Brazilian mobiles', () => {
    expect(normalizePhone('+1 31999999999')).toBe('131999999999');
    expect(isValidMobilePhone('+1 31999999999')).toBe(false);
  });
});
