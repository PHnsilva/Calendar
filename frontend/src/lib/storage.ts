import type { CalendarEvent } from "../features/calendar/types";

const MANAGE_TOKENS_KEY = "calendar.manageTokens";
const LOCAL_EVENTS_KEY = "calendar.localEvents";

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
