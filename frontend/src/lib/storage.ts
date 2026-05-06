import type { CalendarEvent } from "../features/calendar/types";
import type { ServicoResponse } from "../types/api";

const ADMIN_TOKEN_STORAGE_KEY = "calendar.admin.token";
const LEGACY_ADMIN_TOKEN_STORAGE_KEY = "calendar.adminToken";
const MANAGE_TOKENS_KEY = "calendar.manageTokens";
const MANAGE_TOKEN_MAP_KEY = "calendar.manageTokenByEvent";
const LOCAL_EVENTS_KEY = "calendar.localEvents";
const ADMIN_CALENDAR_MODE_KEY = "calendar.admin.mode";
const LOCAL_EVENTS_CHANGED_EVENT = "calendar:local-events-changed";
const GEOAPIFY_AUTOCOMPLETE_DISABLED_KEY = "calendar.geoapifyAutocomplete.disabled";

const PHONE_VERIFICATION_KEY = "calendar.phoneVerification";
const PHONE_VERIFICATION_CHANGED_EVENT = "calendar:phone-verification-changed";

export type StoredPhoneVerification = {
  phone: string;
  verifiedAt: string;
  recoveredCount?: number;
};

type AdminCalendarMode = "view" | "block";
type ManageTokenMap = Record<string, string>;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function readJson<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

function dispatchAdminMode(mode: AdminCalendarMode): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("admin:calendar-mode", { detail: mode }));
}

function dispatchLocalEventsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOCAL_EVENTS_CHANGED_EVENT));
}

function dispatchPhoneVerificationChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PHONE_VERIFICATION_CHANGED_EVENT));
}

export function normalizeBrazilianPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}

export function isValidBrazilianPhone(value: string): boolean {
  const digits = normalizeBrazilianPhone(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatPhoneForDisplay(value: string): string {
  const digits = normalizeBrazilianPhone(value);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getStoredPhoneVerification(): StoredPhoneVerification | null {
  const verification = readJson<StoredPhoneVerification | null>(PHONE_VERIFICATION_KEY, null);
  if (!verification?.phone) return null;

  const phone = normalizeBrazilianPhone(verification.phone);
  if (!isValidBrazilianPhone(phone)) return null;

  return {
    ...verification,
    phone,
  };
}

export function hasStoredPhoneVerification(): boolean {
  return Boolean(getStoredPhoneVerification());
}

export function savePhoneVerification(phone: string, recoveredCount?: number): StoredPhoneVerification | null {
  const normalizedPhone = normalizeBrazilianPhone(phone);
  if (!isValidBrazilianPhone(normalizedPhone)) return null;

  const verification: StoredPhoneVerification = {
    phone: normalizedPhone,
    verifiedAt: new Date().toISOString(),
    recoveredCount,
  };

  writeJson(PHONE_VERIFICATION_KEY, verification);
  dispatchPhoneVerificationChanged();
  return verification;
}

export function clearPhoneVerification(): void {
  getStorage()?.removeItem(PHONE_VERIFICATION_KEY);
  dispatchPhoneVerificationChanged();
}

export function getPhoneVerificationChangedEventName(): string {
  return PHONE_VERIFICATION_CHANGED_EVENT;
}


export function getStoredAdminToken(): string {
  const storage = getStorage();
  return storage?.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim()
    || storage?.getItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY)?.trim()
    || "";
}

export function setStoredAdminToken(token: string): void {
  const normalized = token.trim();
  const storage = getStorage();

  if (!storage) return;
  if (!normalized) {
    storage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    storage.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
    return;
  }

  storage.setItem(ADMIN_TOKEN_STORAGE_KEY, normalized);
  storage.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
}

export function clearStoredAdminToken(): void {
  const storage = getStorage();
  storage?.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  storage?.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
}

export function getManageTokens(): string[] {
  return readJson<string[]>(MANAGE_TOKENS_KEY, []);
}

export function getManageTokenMap(): ManageTokenMap {
  return readJson<ManageTokenMap>(MANAGE_TOKEN_MAP_KEY, {});
}

export function getManageTokensByEvent(): ManageTokenMap {
  return getManageTokenMap();
}

export function getManageTokenByEventId(eventId: string): string {
  return getManageTokenMap()[eventId]?.trim() ?? "";
}

export function getStoredManageToken(): string {
  return getManageTokens()[0] ?? "";
}

export function setStoredManageToken(token: string): void {
  saveManageToken(token);
}

export function saveManageToken(token: string, eventId?: string): void {
  const normalized = token.trim();
  if (!normalized) return;

  const current = getManageTokens().filter((item) => item !== normalized);
  writeJson(MANAGE_TOKENS_KEY, [normalized, ...current].slice(0, 20));

  if (eventId?.trim()) {
    const map = getManageTokenMap();
    map[eventId.trim()] = normalized;
    writeJson(MANAGE_TOKEN_MAP_KEY, map);
  }
}

export function saveRecoveredBookings(bookings: ServicoResponse[]): void {
  bookings.forEach((booking) => {
    if (booking.manageToken?.trim()) {
      saveManageToken(booking.manageToken, booking.eventId);
    }
  });
}

export function resolveManageToken(booking: Pick<ServicoResponse, "eventId" | "manageToken">): string {
  return booking.manageToken?.trim() || getManageTokenByEventId(booking.eventId) || getStoredManageToken();
}

export function getLocalCalendarEvents(): CalendarEvent[] {
  return readJson<CalendarEvent[]>(LOCAL_EVENTS_KEY, []);
}

export function saveLocalCalendarEvent(event: CalendarEvent): void {
  const current = getLocalCalendarEvents().filter((item) => item.id !== event.id);
  writeJson(LOCAL_EVENTS_KEY, [event, ...current]);
  dispatchLocalEventsChanged();
}

export function removeLocalCalendarEvent(eventId: string): void {
  if (!eventId?.trim()) return;

  const next = getLocalCalendarEvents().filter((item) => item.id !== eventId);
  writeJson(LOCAL_EVENTS_KEY, next);

  const map = getManageTokenMap();
  if (map[eventId]) {
    const { [eventId]: _removed, ...rest } = map;
    writeJson(MANAGE_TOKEN_MAP_KEY, rest);
  }

  dispatchLocalEventsChanged();
}

export function getLocalEventsChangedEventName(): string {
  return LOCAL_EVENTS_CHANGED_EVENT;
}

export function canUseGeoapifyAutocomplete(): boolean {
  const value = getStorage()?.getItem(GEOAPIFY_AUTOCOMPLETE_DISABLED_KEY);
  return value !== "true";
}

export function setGeoapifyAutocompleteEnabled(enabled: boolean): void {
  const storage = getStorage();
  if (!storage) return;

  if (enabled) {
    storage.removeItem(GEOAPIFY_AUTOCOMPLETE_DISABLED_KEY);
    return;
  }

  storage.setItem(GEOAPIFY_AUTOCOMPLETE_DISABLED_KEY, "true");
}

export function getAdminCalendarMode(): AdminCalendarMode {
  const value = getStorage()?.getItem(ADMIN_CALENDAR_MODE_KEY);
  return value === "block" ? "block" : "view";
}

export function setAdminCalendarMode(mode: AdminCalendarMode): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ADMIN_CALENDAR_MODE_KEY, mode);
  dispatchAdminMode(mode);
}

export function toggleAdminCalendarMode(): AdminCalendarMode {
  const nextMode = getAdminCalendarMode() === "block" ? "view" : "block";
  setAdminCalendarMode(nextMode);
  return nextMode;
}

export const getAdminToken = getStoredAdminToken;
export const saveStoredAdminToken = setStoredAdminToken;
export const saveAdminToken = setStoredAdminToken;
export const clearAdminToken = clearStoredAdminToken;
