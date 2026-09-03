import type { CalendarEvent } from "../features/calendar/types";
import type { ServicoResponse } from "../types/api";
import type { AdminMeResponse, AdminRole, AdminWorkspaceContext } from "../types/api";
import { isValidPhone, normalizePhone } from "./authRole";

const ADMIN_TOKEN_STORAGE_KEY = "calendar.admin.token";
const LEGACY_ADMIN_TOKEN_STORAGE_KEY = "calendar.adminToken";
const ADMIN_SESSION_STORAGE_KEY = "calendar.admin.session";
const ADMIN_SESSION_CHANGED_EVENT = "calendar:admin-session-changed";
const MANAGE_TOKENS_KEY = "calendar.manageTokens";
const MANAGE_TOKEN_MAP_KEY = "calendar.manageTokenByEvent";
const LOCAL_EVENTS_KEY = "calendar.localEvents";
const ADMIN_CALENDAR_MODE_KEY = "calendar.admin.mode";
const LOCAL_EVENTS_CHANGED_EVENT = "calendar:local-events-changed";
const GEOAPIFY_AUTOCOMPLETE_DISABLED_KEY = "calendar.geoapifyAutocomplete.disabled";

const PHONE_VERIFICATION_KEY = "calendar.phoneVerification";
const PHONE_VERIFICATION_CHANGED_EVENT = "calendar:phone-verification-changed";
const CLIENT_PROFILE_KEY = "calendar.clientProfile";
const CLIENT_PROFILE_CHANGED_EVENT = "calendar:client-profile-changed";

export type StoredPhoneVerification = {
  phone: string;
  verifiedAt: string;
  recoveredCount?: number;
};

export type StoredClientProfile = {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  avatarId?: string;
  updatedAt: string;
  phoneVerifiedAt?: string;
  recoveredCount?: number;
};

type ClientProfilePatch = Partial<Omit<StoredClientProfile, "updatedAt">>;

export type StoredAdminSession = AdminMeResponse & {
  sessionToken: string;
  workspace?: AdminWorkspaceContext;
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

function dispatchClientProfileChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLIENT_PROFILE_CHANGED_EVENT));
}

function dispatchAdminSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_SESSION_CHANGED_EVENT));
}

function cleanOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || undefined;
}

function cleanOptionalEmail(value: unknown): string | undefined {
  const normalized = cleanOptionalText(value)?.toLowerCase();
  return normalized && normalized.includes("@") ? normalized : normalized;
}

export function normalizeBrazilianPhone(value: string): string {
  return normalizePhone(value);
}

export function isValidBrazilianPhone(value: string): boolean {
  return isValidPhone(value);
}

export function formatPhoneForDisplay(value: string): string {
  const digits = normalizeBrazilianPhone(value);

  if (digits.length > 11) return value.trim();
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

export function savePhoneVerification(
  phone: string,
  recoveredCount?: number,
  profilePatch: Omit<ClientProfilePatch, "phone" | "phoneVerifiedAt" | "recoveredCount"> = {},
): StoredPhoneVerification | null {
  const normalizedPhone = normalizeBrazilianPhone(phone);
  if (!isValidBrazilianPhone(normalizedPhone)) return null;

  const verifiedAt = new Date().toISOString();
  const verification: StoredPhoneVerification = {
    phone: normalizedPhone,
    verifiedAt,
    recoveredCount,
  };

  writeJson(PHONE_VERIFICATION_KEY, verification);
  saveClientProfile({
    ...profilePatch,
    phone: normalizedPhone,
    phoneVerifiedAt: verifiedAt,
    recoveredCount,
  });
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

export function getClientProfileChangedEventName(): string {
  return CLIENT_PROFILE_CHANGED_EVENT;
}

export function getStoredClientProfile(): StoredClientProfile | null {
  const profile = readJson<StoredClientProfile | null>(CLIENT_PROFILE_KEY, null);
  if (!profile) return null;

  const name = cleanOptionalText(profile.name);
  const email = cleanOptionalEmail(profile.email);
  const phone = profile.phone ? normalizeBrazilianPhone(profile.phone) : undefined;
  const validPhone = phone && isValidBrazilianPhone(phone) ? phone : undefined;
  const city = cleanOptionalText(profile.city);
  const avatarId = cleanOptionalText(profile.avatarId);

  if (!name && !validPhone && !email && !city && !avatarId) return null;

  return {
    ...profile,
    ...(name ? { name } : {}),
    ...(validPhone ? { phone: validPhone } : {}),
    ...(email ? { email } : {}),
    ...(city ? { city } : {}),
    ...(avatarId ? { avatarId } : {}),
  };
}

export function saveClientProfile(patch: ClientProfilePatch): StoredClientProfile | null {
  const current = getStoredClientProfile();
  const phone = patch.phone ? normalizeBrazilianPhone(patch.phone) : current?.phone;
  const validPhone = phone && isValidBrazilianPhone(phone) ? phone : undefined;
  const name = cleanOptionalText(patch.name) ?? current?.name;
  const email = cleanOptionalEmail(patch.email) ?? current?.email;
  const phoneChanged = patch.phone !== undefined && validPhone !== current?.phone;
  const phoneVerifiedAt = phoneChanged ? patch.phoneVerifiedAt : patch.phoneVerifiedAt ?? current?.phoneVerifiedAt;
  const recoveredCount = phoneChanged ? patch.recoveredCount : patch.recoveredCount ?? current?.recoveredCount;
  const city = cleanOptionalText(patch.city) ?? current?.city;
  const avatarId = cleanOptionalText(patch.avatarId) ?? current?.avatarId;

  if (!name && !validPhone && !email && !city && !avatarId) return current;

  const profile: StoredClientProfile = {
    ...(name ? { name } : {}),
    ...(validPhone ? { phone: validPhone } : {}),
    ...(email ? { email } : {}),
    ...(city ? { city } : {}),
    ...(avatarId ? { avatarId } : {}),
    ...(phoneVerifiedAt ? { phoneVerifiedAt } : {}),
    ...(typeof recoveredCount === "number" ? { recoveredCount } : {}),
    updatedAt: new Date().toISOString(),
  };

  writeJson(CLIENT_PROFILE_KEY, profile);
  if (phoneChanged && !patch.phoneVerifiedAt) {
    getStorage()?.removeItem(PHONE_VERIFICATION_KEY);
    dispatchPhoneVerificationChanged();
  }
  dispatchClientProfileChanged();
  return profile;
}


export function getStoredAdminToken(): string {
  const session = getStoredAdminSession();
  if (session?.sessionToken) return session.sessionToken;

  const storage = getStorage();
  return storage?.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim()
    || storage?.getItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY)?.trim()
    || "";
}

function normalizeWorkspace(session: StoredAdminSession): AdminWorkspaceContext | undefined {
  const workspace = session.workspace;
  if (workspace?.mode === "PROVIDER" && workspace.providerId?.trim()) {
    return {
      mode: "PROVIDER",
      providerId: workspace.providerId.trim(),
      providerName: workspace.providerName?.trim() || undefined,
      impersonatedByOwner: workspace.impersonatedByOwner || undefined,
    };
  }
  if (workspace?.mode === "ADMIN" && session.role === "OWNER") {
    return { mode: "ADMIN" };
  }
  if (session.role === "PROVIDER") {
    return { mode: "PROVIDER", providerId: session.id, providerName: session.name };
  }
  return undefined;
}

export function setStoredAdminToken(token: string): void {
  const normalized = token.trim();
  const storage = getStorage();

  if (!storage) return;
  if (!normalized) {
    storage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    storage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    storage.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
    dispatchAdminSessionChanged();
    return;
  }

  const fallbackSession: StoredAdminSession = {
    id: "legacy-owner",
    name: "Admin",
    phone: "",
    role: "OWNER",
    permissions: [],
    sessionExpiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    sessionToken: normalized,
  };
  writeJson(ADMIN_SESSION_STORAGE_KEY, fallbackSession);
  storage.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
  storage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  dispatchAdminSessionChanged();
}

export function clearStoredAdminToken(): void {
  const storage = getStorage();
  storage?.removeItem(ADMIN_SESSION_STORAGE_KEY);
  storage?.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  storage?.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
  dispatchAdminSessionChanged();
}

export function getAdminSessionChangedEventName(): string {
  return ADMIN_SESSION_CHANGED_EVENT;
}

export function getStoredAdminSession(): StoredAdminSession | null {
  const session = readJson<StoredAdminSession | null>(ADMIN_SESSION_STORAGE_KEY, null);
  if (!session?.sessionToken) return null;
  if (session.sessionExpiresAt && session.sessionExpiresAt * 1000 < Date.now()) {
    clearStoredAdminToken();
    return null;
  }
  return {
    ...session,
    workspace: normalizeWorkspace(session),
  };
}

export function saveAdminSession(sessionToken: string, admin: AdminMeResponse): StoredAdminSession {
  const session: StoredAdminSession = {
    ...admin,
    sessionToken: sessionToken.trim(),
    workspace: admin.role === "PROVIDER" ? { mode: "PROVIDER", providerId: admin.id, providerName: admin.name } : undefined,
  };
  writeJson(ADMIN_SESSION_STORAGE_KEY, session);
  getStorage()?.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  getStorage()?.removeItem(LEGACY_ADMIN_TOKEN_STORAGE_KEY);
  dispatchAdminSessionChanged();
  return session;
}

export function setAdminWorkspace(workspace: AdminWorkspaceContext): StoredAdminSession | null {
  const session = getStoredAdminSession();
  if (!session) return null;
  const normalized: AdminWorkspaceContext = workspace.mode === "PROVIDER"
    ? {
        mode: "PROVIDER",
        providerId: workspace.providerId?.trim(),
        providerName: workspace.providerName?.trim() || undefined,
        impersonatedByOwner: workspace.impersonatedByOwner || undefined,
      }
    : { mode: "ADMIN" };
  const nextSession: StoredAdminSession = {
    ...session,
    workspace: normalized,
  };
  writeJson(ADMIN_SESSION_STORAGE_KEY, nextSession);
  dispatchAdminSessionChanged();
  return nextSession;
}

export function getStoredAdminWorkspace(): AdminWorkspaceContext | undefined {
  return getStoredAdminSession()?.workspace;
}

export function getStoredAdminWorkspaceHeaders(): Record<string, string> {
  const workspace = getStoredAdminWorkspace();
  if (!workspace) return {};
  if (workspace.mode === "PROVIDER" && workspace.providerId) {
    return {
      "X-ADMIN-WORKSPACE": "PROVIDER",
      "X-ADMIN-PROVIDER-ID": workspace.providerId,
    };
  }
  if (workspace.mode === "ADMIN") {
    return { "X-ADMIN-WORKSPACE": "ADMIN" };
  }
  return {};
}

export function getStoredAdminRole(): AdminRole | null {
  return getStoredAdminSession()?.role ?? null;
}

export function isStoredAdminOwner(): boolean {
  const session = getStoredAdminSession();
  return session?.role === "OWNER" && session.workspace?.mode === "ADMIN";
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

export function removeManageToken(token: string, eventId?: string): void {
  const normalized = token.trim();
  if (!normalized) return;

  writeJson(MANAGE_TOKENS_KEY, getManageTokens().filter((item) => item !== normalized));

  if (eventId?.trim()) {
    const normalizedEventId = eventId.trim();
    const map = getManageTokenMap();
    if (map[normalizedEventId] === normalized) {
      delete map[normalizedEventId];
      writeJson(MANAGE_TOKEN_MAP_KEY, map);
    }
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
    delete map[eventId];
    writeJson(MANAGE_TOKEN_MAP_KEY, map);
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
