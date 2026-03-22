import type { CalendarEvent } from "../features/calendar/types";

const ADMIN_TOKEN_STORAGE_KEY = "calendar.admin.token";
const MANAGE_TOKENS_KEY = "calendar.manageTokens";
const LOCAL_EVENTS_KEY = "calendar.localEvents";

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

export function getStoredAdminToken(): string {
  return getStorage()?.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim() ?? "";
}

export function setStoredAdminToken(token: string): void {
  const normalized = token.trim();
  const storage = getStorage();

  if (!storage) {
    return;
  }

  if (!normalized) {
    storage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    return;
  }

  storage.setItem(ADMIN_TOKEN_STORAGE_KEY, normalized);
}

export function clearStoredAdminToken(): void {
  getStorage()?.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function getManageTokens(): string[] {
  return readJson<string[]>(MANAGE_TOKENS_KEY, []);
}

export function getStoredManageToken(): string {
  return getManageTokens()[0] ?? "";
}

export function setStoredManageToken(token: string): void {
  saveManageToken(token);
}

export function saveManageToken(token: string): void {
  const normalized = token.trim();
  if (!normalized) return;

  const current = getManageTokens().filter((item) => item !== normalized);
  writeJson(MANAGE_TOKENS_KEY, [normalized, ...current].slice(0, 10));
}

export function getLocalCalendarEvents(): CalendarEvent[] {
  return readJson<CalendarEvent[]>(LOCAL_EVENTS_KEY, []);
}

export function saveLocalCalendarEvent(event: CalendarEvent): void {
  const current = getLocalCalendarEvents().filter((item) => item.id !== event.id);
  writeJson(LOCAL_EVENTS_KEY, [event, ...current]);
}
