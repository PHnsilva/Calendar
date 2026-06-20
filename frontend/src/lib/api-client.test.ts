import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "http://backend.test");
  vi.unstubAllGlobals();
});

describe("apiClient", () => {
  it("wraps network failures with a structured ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { apiGet } = await import("./api-client");

    await expect(apiGet("/api/admin/auth/start")).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      code: "NETWORK_ERROR",
      method: "GET",
      url: "http://backend.test/api/admin/auth/start",
    });
  });
});
