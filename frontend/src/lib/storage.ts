import type { CalendarEvent } from "../features/calendar/types";

const MANAGE_TOKENS_KEY = "calendar.manageTokens";
const LOCAL_EVENTS_KEY = "calendar.localEvents";
const ADMIN_TOKEN_KEY = "calendar.adminToken";
const GEOAPIFY_USAGE_KEY = "calendar.geoapifyUsage";

const AUTOCOMPLETE_DAILY_LIMIT = 30;
const ADDRESS_VALIDATION_FAILURE_LIMIT = 3;

export type GeoapifyUsageState = {
  day: string;
  autocompleteRequests: number;
  addressValidationFailures: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeUsageState(state?: Partial<GeoapifyUsageState> | null): GeoapifyUsageState {
  const day = getTodayKey();
  if (!state || state.day != day) {
    return {
      day,
      autocompleteRequests: 0,
      addressValidationFailures: 0,
    };
  }

  return {
    day,
    autocompleteRequests: Number(state.autocompleteRequests ?? 0),
    addressValidationFailures: Number(state.addressValidationFailures ?? 0),
  };
}

export function getGeoapifyUsageState(): GeoapifyUsageState {
  return normalizeUsageState(readJson<Partial<GeoapifyUsageState> | null>(GEOAPIFY_USAGE_KEY, null));
}

function saveGeoapifyUsageState(state: GeoapifyUsageState) {
  writeJson(GEOAPIFY_USAGE_KEY, state);
}

export function canUseGeoapifyAutocomplete() {
  const state = getGeoapifyUsageState();
  return state.autocompleteRequests < AUTOCOMPLETE_DAILY_LIMIT && state.addressValidationFailures < ADDRESS_VALIDATION_FAILURE_LIMIT;
}

export function incrementGeoapifyAutocompleteRequests() {
  const current = getGeoapifyUsageState();
  const next = {
    ...current,
    autocompleteRequests: current.autocompleteRequests + 1,
  };
  saveGeoapifyUsageState(next);
  return next;
}

export function registerAddressValidationFailure() {
  const current = getGeoapifyUsageState();
  const next = {
    ...current,
    addressValidationFailures: current.addressValidationFailures + 1,
  };
  saveGeoapifyUsageState(next);
  return next;
}

export function getGeoapifyAutocompleteStatusMessage() {
  const state = getGeoapifyUsageState();

  if (state.addressValidationFailures >= ADDRESS_VALIDATION_FAILURE_LIMIT) {
    return "Digite seu endereço completo. Ex.: Rua João, 123, Alameda Rodrigues.";
  }

  if (state.autocompleteRequests >= AUTOCOMPLETE_DAILY_LIMIT) {
    return "Digite seu endereço completo. Ex.: Rua João, 123, Alameda Rodrigues.";
  }

  return "";
}

export function getManageTokens(): string[] {
  return readJson<string[]>(MANAGE_TOKENS_KEY, []);
}

export function saveManageToken(token: string) {
  const current = getManageTokens();
  if (current.includes(token)) return;
  writeJson(MANAGE_TOKENS_KEY, [token, ...current].slice(0, 10));
}

export function getLocalCalendarEvents(): CalendarEvent[] {
  return readJson<CalendarEvent[]>(LOCAL_EVENTS_KEY, []);
}

export function saveLocalCalendarEvent(event: CalendarEvent) {
  const current = getLocalCalendarEvents().filter((item) => item.id !== event.id);
  writeJson(LOCAL_EVENTS_KEY, [event, ...current]);
}

export function getStoredAdminToken(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY)?.trim() || "";
}

export function saveAdminToken(token: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
}

export function clearAdminToken() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}
