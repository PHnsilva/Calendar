export type UserRole = 'admin' | 'client';

const defaultOwnerAdminPhone = '31995438467';

const configuredAdminPhones = [
  import.meta.env.VITE_ADMIN_AUTH_PHONES,
  import.meta.env.VITE_ADMIN_PHONES,
]
  .filter((value): value is string => Boolean(value?.trim()))
  .join(',');

const configuredOwnerAdminPhones = [
  import.meta.env.VITE_OWNER_ADMIN_PHONE,
  import.meta.env.VITE_OWNER_ADMIN_PHONES,
]
  .filter((value): value is string => Boolean(value?.trim()))
  .join(',');

export const adminPhoneConfigSource = configuredAdminPhones
  ? 'VITE_ADMIN_AUTH_PHONES/VITE_ADMIN_PHONES'
  : 'backend-admin-auth';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizePhone(value: string): string {
  let digits = digitsOnly(value);

  while (digits.length > 11 && digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  while (digits.length > 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length === 10 || digits.length === 11;
}

export function isValidMobilePhone(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length === 11 && digits[2] === '9';
}

export function formatPhoneInput(value: string): string {
  const digits = normalizePhone(value);
  if (digits.length > 11) return value;
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const adminPhoneSet = new Set(
  configuredAdminPhones
    .split(',')
    .map((phone) => normalizePhone(phone.trim()))
    .filter(isValidPhone),
);

const ownerAdminPhoneSet = new Set(
  [defaultOwnerAdminPhone, ...configuredOwnerAdminPhones.split(',')]
    .map((phone) => normalizePhone(phone.trim()))
    .filter(isValidPhone),
);

export function isAdminPhone(value: string): boolean {
  return adminPhoneSet.has(normalizePhone(value));
}

export function isOwnerAdminPhone(value: string): boolean {
  return ownerAdminPhoneSet.has(normalizePhone(value));
}

export function resolveUserRoleByPhone(value: string): UserRole {
  return isOwnerAdminPhone(value) || isAdminPhone(value) ? 'admin' : 'client';
}
