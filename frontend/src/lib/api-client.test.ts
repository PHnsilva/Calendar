import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "http://backend.test");
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
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

  it("does not expose technical backend payloads in ApiError.message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "SUPABASE_TIMEOUT",
      error: "SUPABASE_TIMEOUT",
      message: "Supabase connection error while querying database",
      retryable: true,
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })));

    const { apiGet } = await import("./api-client");

    await expect(apiGet("/api/admin/auth/start")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      code: "DEPENDENCY_TIMEOUT",
      message: "Não foi possível concluir agora. Tente novamente em alguns instantes.",
      retryable: true,
    });
  });

  it("preserves safe backend booking messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "BOOKING_SLOT_UNAVAILABLE",
      message: "Esse horário acabou de ficar indisponível. Escolha outro horário.",
      retryable: false,
    }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    })));

    const { apiPost } = await import("./api-client");

    await expect(apiPost("/api/servicos", {})).rejects.toMatchObject({
      code: "BOOKING_SLOT_UNAVAILABLE",
      message: "Esse horário acabou de ficar indisponível. Escolha outro horário.",
      retryable: false,
    });
  });

  it("aborts requests that exceed the configured timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    })));

    const { apiGet } = await import("./api-client");
    const request = apiGet("/api/servicos", { timeoutMs: 50 });
    const expectation = expect(request).rejects.toMatchObject({
      name: "ApiError",
      status: 408,
      code: "DEPENDENCY_TIMEOUT",
      retryable: true,
    });

    await vi.advanceTimersByTimeAsync(50);

    await expectation;
  });

  it("ignores raw string responses from failing endpoints", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Internal Server Error: SQL exception", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    })));

    const { apiGet } = await import("./api-client");

    await expect(apiGet("/api/servicos")).rejects.toMatchObject({
      code: "UNEXPECTED_ERROR",
      message: "Algo deu errado ao concluir a ação. Tente novamente.",
    });
  });
});
