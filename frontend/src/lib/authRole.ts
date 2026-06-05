export type UserRole = 'admin' | 'client';

const configuredAdminPhones = [
  import.meta.env.VITE_ADMIN_AUTH_PHONES,
  import.meta.env.VITE_ADMIN_PHONES,
]
  .filter((value): value is string => Boolean(value?.trim()))
  .join(',');

export const adminPhoneConfigSource = configuredAdminPhones
  ? 'VITE_ADMIN_AUTH_PHONES/VITE_ADMIN_PHONES'
  : 'backend-admin-auth';

export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, '');

  while (digits.length > 11 && digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  while (digits.length > 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 11);
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length === 10 || digits.length === 11;
}

const adminPhoneSet = new Set(
  configuredAdminPhones
    .split(',')
    .map((phone) => normalizePhone(phone.trim()))
    .filter(isValidPhone),
);

export function isAdminPhone(value: string): boolean {
  return adminPhoneSet.has(normalizePhone(value));
}

export function resolveUserRoleByPhone(value: string): UserRole {
  return isAdminPhone(value) ? 'admin' : 'client';
}
