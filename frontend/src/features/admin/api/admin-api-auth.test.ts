// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAuthConfirmResponse, ServicoRequest } from "../../../types/api";

const admin = {
  id: "admin-1",
  name: "Admin",
  phone: "31999999999",
  role: "OWNER" as const,
  permissions: ["BOOKINGS_READ_ALL"],
  sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
};

const bookingPayload: ServicoRequest = {
  serviceType: "Visita tecnica",
  serviceNotes: "Trocar tomada",
  date: "2026-07-10",
  time: "09:00",
  clientFirstName: "Pedro",
  clientLastName: "Silva",
  clientEmail: "pedro@example.com",
  clientPhone: "31999999999",
  clientCep: "35450000",
  clientStreet: "Rua Sao Jose",
  clientNeighborhood: "Centro",
  clientNumber: "123",
  clientCity: "Itabirito",
  clientState: "MG",
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "http://backend.test");
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("admin API authentication", () => {
  it("adds the stored session header to every consolidated admin API module", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
    vi.stubGlobal("fetch", fetchMock);

    const { saveAdminSession } = await import("../../../lib/storage");
    saveAdminSession("session-token", admin);

    const { getAdminMe, listAdminProviders } = await import("./admin-auth");
    const { assignAdminProvider } = await import("./assign-admin-provider");
    const { bulkCancelAdminBookings } = await import("./bulk-cancel-admin-bookings");
    const { computeAdminRoute } = await import("./compute-admin-route");
    const { deleteAdminBooking } = await import("./delete-admin-booking");
    const { getAdminBookings } = await import("./get-admin-bookings");
    const { getAdminDashboardSummary } = await import("./get-admin-dashboard-summary");
    const { getAdminHistory } = await import("./get-admin-history");
    const { listAdminBlocks } = await import("./manage-admin-blocks");
    const { updateAdminBooking } = await import("./update-admin-booking");

    await getAdminMe();
    await listAdminProviders();
    await assignAdminProvider("event-1", "provider-1");
    await bulkCancelAdminBookings({ eventIds: ["event-1"], reason: "Indisponibilidade" });
    await computeAdminRoute({ eventId: "event-1", originLat: -20.25, originLng: -43.8 });
    await deleteAdminBooking("event-1");
    await getAdminBookings({ from: "2026-07-01", to: "2026-07-31", city: "Itabirito" });
    await getAdminDashboardSummary({ from: "2026-07-01", to: "2026-07-31", city: "Itabirito" });
    await getAdminHistory({ status: "CONFIRMED" });
    await listAdminBlocks({ mode: "BLOCK" });
    await updateAdminBooking("event-1", bookingPayload);

    expect(fetchMock).toHaveBeenCalledTimes(11);
    for (const request of fetchMock.mock.calls) {
      expect(new Headers(request[1]?.headers).get("X-ADMIN-SESSION")).toBe("session-token");
    }

    const bookingsUrl = new URL(String(fetchMock.mock.calls[6]?.[0]));
    expect(bookingsUrl.pathname).toBe("/api/servicos/admin");
    expect(bookingsUrl.searchParams.get("from")).toBe("2026-07-01");
    expect(bookingsUrl.searchParams.get("to")).toBe("2026-07-31");
    expect(bookingsUrl.searchParams.get("city")).toBe("Itabirito");
  });

  it("persists a confirmed login for subsequent authenticated requests", async () => {
    const confirmed: AdminAuthConfirmResponse = { sessionToken: "confirmed-token", admin };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(confirmed), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(admin), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const { confirmAdminLogin, getAdminMe } = await import("./admin-auth");

    await confirmAdminLogin("verification-1", "123456");
    await getAdminMe();

    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has("X-ADMIN-SESSION")).toBe(false);
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("X-ADMIN-SESSION")).toBe("confirmed-token");
  });

  it("sends provider workspace headers with authenticated admin requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { saveAdminSession, setAdminWorkspace } = await import("../../../lib/storage");
    saveAdminSession("session-token", admin);
    setAdminWorkspace({ mode: "PROVIDER", providerId: "provider-2", providerName: "Prestador 2" });

    const { getAdminBookings } = await import("./get-admin-bookings");
    await getAdminBookings();

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("X-ADMIN-SESSION")).toBe("session-token");
    expect(headers.get("X-ADMIN-WORKSPACE")).toBe("PROVIDER");
    expect(headers.get("X-ADMIN-PROVIDER-ID")).toBe("provider-2");
  });
});
