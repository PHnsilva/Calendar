import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "http://backend.test");
  vi.unstubAllGlobals();
});

describe("getAvailableSlots", () => {
  it("loads available slots for the selected day and filters unavailable items", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      availableSlots: [
        { date: "2026-06-10", startTime: "13:00", endTime: "14:00", available: true },
        { date: "2026-06-10", startTime: "09:00", endTime: "10:00", available: true },
        { date: "2026-06-10", startTime: "15:00", endTime: "16:00", available: false },
      ],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { getAvailableSlots } = await import("./get-available-slots");
    const slots = await getAvailableSlots("2026-06-10", "Itabirito", 60, 60);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(url.pathname).toBe("/api/servicos/available");
    expect(url.searchParams.get("date")).toBe("2026-06-10");
    expect(url.searchParams.get("city")).toBe("Itabirito");
    expect(slots.map((slot) => slot.startTime)).toEqual(["09:00", "13:00"]);
  });

  it("maps a missing availability route to a user-facing message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 404,
      error: "NOT_FOUND",
      message: "Not Found",
      path: "/api/servicos/available",
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })));

    const { getAvailableSlots } = await import("./get-available-slots");

    await expect(getAvailableSlots("2026-06-10", "Itabirito", 60, 60)).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining("horarios nao estao disponiveis"),
    });
  });
});
