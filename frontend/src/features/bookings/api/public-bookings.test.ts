import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "http://backend.test");
  vi.unstubAllGlobals();
});

describe("public booking API", () => {
  it("sends the phone in POST bodies instead of query strings", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventId: "booking-1", serviceType: "Electrical", start: "2099-01-01T12:00:00Z", status: "CANCELLED" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { cancelPublicBooking, lookupPublicBookings } = await import("./public-bookings");

    await lookupPublicBookings("31999999999");
    await cancelPublicBooking("booking-1", "31999999999");

    const lookupUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const lookupOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const cancelOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(lookupUrl.pathname).toBe("/api/servicos/public/lookup");
    expect(lookupUrl.search).toBe("");
    expect(lookupOptions.method).toBe("POST");
    expect(JSON.parse(String(lookupOptions.body))).toEqual({ phone: "31999999999" });
    expect(JSON.parse(String(cancelOptions.body))).toEqual({ eventId: "booking-1", phone: "31999999999" });
  });
});
