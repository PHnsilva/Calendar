export function isSiteHoldingPageEnabled(): boolean {
  return import.meta.env.VITE_SITE_HOLDING_PAGE === "true";
}
