// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAnalyticsPageViewForTests, trackEvent, trackPageView } from "./analytics";

describe("analytics privacy and page-view tracking", () => {
  afterEach(() => {
    delete window.gtag;
    resetAnalyticsPageViewForTests();
  });

  it("deduplicates consecutive SPA page views and excludes query strings", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    document.title = "Página privada";

    trackPageView("/recover");
    trackPageView("/recover");

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "page_view", expect.objectContaining({
      page_location: `${window.location.origin}/recover`,
      page_path: "/recover",
    }));
  });

  it("only sends allowlisted, sanitized event dimensions", () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackEvent("city_selected", { city: "  Belo Horizonte  " });

    expect(gtag).toHaveBeenCalledWith("event", "city_selected", { city: "Belo Horizonte" });
  });

  it("redacts booking identifiers and unknown paths from page views", () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPageView("/admin/booking/private-token-123");

    expect(gtag).toHaveBeenCalledWith("event", "page_view", expect.objectContaining({
      page_path: "/admin/booking/:eventId",
      page_location: `${window.location.origin}/admin/booking/:eventId`,
    }));
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("private-token-123");
  });
});
