export type AnalyticsEventName =
  | "booking_start"
  | "booking_success"
  | "service_selected"
  | "city_selected"
  | "whatsapp_click"
  | "phone_click"
  | "instagram_click"
  | "booking_error";

type SafeEventParameters = {
  city?: string;
  service?: string;
};

type Gtag = (
  command: "event",
  eventName: string,
  parameters?: Record<string, string | boolean>,
) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const SAFE_PARAMETER_KEYS = new Set<keyof SafeEventParameters>(["city", "service"]);
const SAFE_STATIC_PATHS = new Set(["/", "/meus-agendamentos", "/403", "/500", "/admin", "/admin/dashboard", "/prestador", "/prestador/dashboard"]);
let lastPagePath = "";
const recentEvents = new Map<string, number>();

function cleanDimension(value: string): string {
  return value.trim().replace(/[^\p{L}\p{N} .,&+/-]/gu, "").slice(0, 80);
}

function getSafeParameters(parameters: SafeEventParameters = {}): Record<string, string> {
  return Object.entries(parameters).reduce<Record<string, string>>((safe, [key, value]) => {
    if (!SAFE_PARAMETER_KEYS.has(key as keyof SafeEventParameters) || typeof value !== "string") return safe;
    const cleaned = cleanDimension(value);
    if (cleaned) safe[key] = cleaned;
    return safe;
  }, {});
}

function getSafePagePath(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (SAFE_STATIC_PATHS.has(normalized)) return normalized;
  if (/^\/admin\/booking\/[^/]+$/.test(normalized)) return "/admin/booking/:eventId";
  if (/^\/prestador\/booking\/[^/]+$/.test(normalized)) return "/prestador/booking/:eventId";
  return "/not-found";
}

export function trackPageView(pathname: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const pagePath = getSafePagePath(pathname);
  if (lastPagePath === pagePath) return;
  lastPagePath = pagePath;
  window.gtag("event", "page_view", {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: document.title,
  });
}

export function trackEvent(eventName: AnalyticsEventName, parameters?: SafeEventParameters): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const safeParameters = getSafeParameters(parameters);
  const eventKey = `${eventName}:${JSON.stringify(safeParameters)}`;
  const now = Date.now();
  if (now - (recentEvents.get(eventKey) ?? 0) < 800) return;
  recentEvents.set(eventKey, now);
  window.gtag("event", eventName, safeParameters);
}

export function resetAnalyticsPageViewForTests(): void {
  lastPagePath = "";
  recentEvents.clear();
}
