import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServicoRequest } from "../../../types/api";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "http://backend.test");
  vi.unstubAllGlobals();
});

describe("createBooking", () => {
  it("posts the service registration payload to the real create service endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      servico: { eventId: "event-1" },
      manageToken: "manage-token",
      verificationId: "verification-1",
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
      pendingExpiresAt: "2026-06-05T12:00:00Z",
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const payload: ServicoRequest = {
      serviceType: "Visita tecnica",
      serviceNotes: "Trocar tomada da sala",
      date: "2026-06-10",
      time: "09:00",
      clientFirstName: "Pedro",
      clientLastName: "Silva",
      clientEmail: "pedro@example.com",
      clientPhone: "31999999999",
      clientCep: "35450000",
      clientStreet: "Rua Sao Jose",
      clientNeighborhood: "Centro",
      clientNumber: "123",
      clientComplement: "Apto 101",
      clientCity: "Itabirito",
      clientState: "MG",
    };

    const { createBooking } = await import("./create-booking");
    await createBooking(payload);

    const request = fetchMock.mock.calls[0];
    expect(String(request?.[0])).toBe("http://backend.test/api/servicos");
    expect(request?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(request?.[1]?.body))).toEqual(payload);
  });
});
