import type { CalendarEvent } from "../features/calendar/types";

const ADMIN_TOKEN_STORAGE_KEY = "calendar.admin.token";
const MANAGE_TOKENS_KEY = "calendar.manageTokens";
const MANAGE_TOKEN_BY_EVENT_KEY = "calendar.manageTokensByEvent";
const LOCAL_EVENTS_KEY = "calendar.localEvents";
const ADMIN_CALENDAR_MODE_KEY = "calendar.admin.mode";
const LOCAL_EVENTS_CHANGED_EVENT = "calendar:local-events-changed";

type AdminCalendarMode = "view" | "block";
type ManageTokenByEventMap = Record<string, string>;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
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

export function getStoredAdminToken(): string {
  return getStorage()?.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim() ?? "";
}

export function setStoredAdminToken(token: string): void {
  const normalized = token.trim();
  const storage = getStorage();
  if (!storage) return;
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

export function getManageTokensByEvent(): ManageTokenByEventMap {
  return readJson<ManageTokenByEventMap>(MANAGE_TOKEN_BY_EVENT_KEY, {});
}

export function getManageTokenByEventId(eventId: string): string {
  if (!eventId) return "";
  return getManageTokensByEvent()[eventId]?.trim() ?? "";
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
    const currentMap = getManageTokensByEvent();
    writeJson(MANAGE_TOKEN_BY_EVENT_KEY, {
      ...currentMap,
      [eventId.trim()]: normalized,
    });
  }
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
  if (!eventId) return;
  const next = getLocalCalendarEvents().filter((item) => item.id !== eventId);
  writeJson(LOCAL_EVENTS_KEY, next);
  const currentMap = getManageTokensByEvent();
  if (currentMap[eventId]) {
    const { [eventId]: _removed, ...rest } = currentMap;
    writeJson(MANAGE_TOKEN_BY_EVENT_KEY, rest);
  }
  dispatchLocalEventsChanged();
}

export function getLocalEventsChangedEventName(): string {
  return LOCAL_EVENTS_CHANGED_EVENT;
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
