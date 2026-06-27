import { describe, expect, it } from 'vitest';
import { applyOtpBackspace, applyOtpInput, codeToOtpDigits, normalizeOtpCode, otpDigitsToCode } from './otp';

describe('otp helpers', () => {
  it('normalizes only three numeric digits', () => {
    expect(normalizeOtpCode('12a34')).toBe('123');
  });

  it('maps code into fixed slots without collapsing positions', () => {
    expect(codeToOtpDigits('12')).toEqual(['1', '2', '']);
    expect(otpDigitsToCode(['1', '2', '3'])).toBe('123');
  });

  it('fills sequential digits from pasted input', () => {
    expect(applyOtpInput(['', '', ''], 0, '123')).toEqual({
      digits: ['1', '2', '3'],
      focusIndex: 2,
    });
    expect(applyOtpInput(['', '', ''], 0, 'Codigo: 1-2 3')).toEqual({
      digits: ['1', '2', '3'],
      focusIndex: 2,
    });
  });

  it('clears current or previous digit on backspace', () => {
    expect(applyOtpBackspace(['1', '2', '3'], 2)).toEqual({
      digits: ['1', '2', ''],
      focusIndex: 2,
    });
    expect(applyOtpBackspace(['1', '', ''], 1)).toEqual({
      digits: ['', '', ''],
      focusIndex: 0,
    });
  });
});
