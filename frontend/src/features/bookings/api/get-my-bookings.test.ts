import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "http://backend.test");
  vi.unstubAllGlobals();
});

describe("getMyBookings", () => {
  it("loads the read-only list through the booking entity boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      eventId: "event-1",
      eventLink: null,
      serviceType: "Visita tecnica",
      serviceNotes: null,
      start: "2026-06-10T12:00:00Z",
      end: "2026-06-10T13:00:00Z",
      clientFirstName: "Pedro",
      clientLastName: "Silva",
      clientEmail: null,
      clientPhone: "31999999999",
      clientCep: null,
      clientStreet: null,
      clientNeighborhood: null,
      clientNumber: null,
      clientCity: "Itabirito",
      clientState: "MG",
      clientAddressLine: "Itabirito/MG",
      status: "PENDING_PHONE",
    }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { getMyBookings } = await import("./get-my-bookings");
    const bookings = await getMyBookings("manage-token");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(url.pathname).toBe("/api/servicos/my");
    expect(url.searchParams.get("token")).toBe("manage-token");
    expect(bookings[0]).toMatchObject({
      id: "event-1",
      startsAt: new Date("2026-06-10T12:00:00Z"),
      status: { code: "pending", raw: "PENDING_PHONE" },
    });
    expect(bookings[0]).not.toHaveProperty("eventId");
  });
});
