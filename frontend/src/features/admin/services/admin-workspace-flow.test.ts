// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAuthConfirmResponse, AdminMeResponse } from "../../../types/api";

const sessionExpiresAt = Math.floor(Date.now() / 1000) + 3600;

function response(admin: AdminMeResponse): AdminAuthConfirmResponse {
  return { sessionToken: "session-token", admin };
}

beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
});

describe("admin workspace login flow", () => {
  it("requires a workspace choice for owner login results", async () => {
    const { resolveAdminLoginDestination, ADMIN_BOOKINGS_ROUTE } = await import("./admin-workspace-flow");

    const destination = resolveAdminLoginDestination(response({
      id: "owner-1",
      name: "Owner",
      phone: "31999999999",
      role: "OWNER",
      permissions: ["BOOKINGS_READ_ALL"],
      sessionExpiresAt,
    }));

    expect(destination).toEqual({ kind: "choose-workspace", to: ADMIN_BOOKINGS_ROUTE });
  });

  it("stores provider workspace for provider login results", async () => {
    const { saveAdminSession, getStoredAdminSession } = await import("../../../lib/storage");
    const { applyAdminLoginDestination, PROVIDER_BOOKINGS_ROUTE } = await import("./admin-workspace-flow");
    const admin: AdminMeResponse = {
      id: "provider-1",
      name: "Prestador 1",
      phone: "31988888888",
      role: "PROVIDER",
      permissions: ["BOOKINGS_READ_ASSIGNED"],
      sessionExpiresAt,
    };

    saveAdminSession("session-token", admin);
    const destination = applyAdminLoginDestination(response(admin));

    expect(destination).toEqual({
      kind: "navigate",
      to: PROVIDER_BOOKINGS_ROUTE,
      workspace: { mode: "PROVIDER", providerId: "provider-1", providerName: "Prestador 1" },
    });
    expect(getStoredAdminSession()?.workspace).toEqual({
      mode: "PROVIDER",
      providerId: "provider-1",
      providerName: "Prestador 1",
    });
  });
});
