export const OTP_CODE_LENGTH = 3;

export function createOtpDigits(length = OTP_CODE_LENGTH): string[] {
  return Array.from({ length }, () => '');
}

export function normalizeOtpCode(value: string, length = OTP_CODE_LENGTH): string {
  return value.replace(/\D/g, '').slice(0, length);
}

export function codeToOtpDigits(code: string, length = OTP_CODE_LENGTH): string[] {
  const digits = createOtpDigits(length);
  normalizeOtpCode(code, length).split('').forEach((digit, index) => {
    digits[index] = digit;
  });
  return digits;
}

export function otpDigitsToCode(digits: string[]): string {
  return digits.join('');
}

export function applyOtpInput(current: string[], index: number, rawValue: string): { digits: string[]; focusIndex: number } {
  const input = normalizeOtpCode(rawValue, current.length);
  const next = [...current];

  if (!input) {
    next[index] = '';
    return { digits: next, focusIndex: Math.max(0, index - 1) };
  }

  input.split('').forEach((digit, offset) => {
    const targetIndex = index + offset;
    if (targetIndex < next.length) {
      next[targetIndex] = digit;
    }
  });

  return {
    digits: next,
    focusIndex: Math.min(index + input.length, next.length - 1),
  };
}

export function applyOtpBackspace(current: string[], index: number): { digits: string[]; focusIndex: number } {
  const next = [...current];

  if (next[index]) {
    next[index] = '';
    return { digits: next, focusIndex: index };
  }

  if (index === 0) {
    return { digits: next, focusIndex: 0 };
  }

  next[index - 1] = '';
  return { digits: next, focusIndex: index - 1 };
}
