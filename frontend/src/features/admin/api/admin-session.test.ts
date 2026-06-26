// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminMeResponse } from "../../../types/api";

const admin: AdminMeResponse = {
  id: "admin-1",
  name: "Admin",
  phone: "31999999999",
  role: "OWNER",
  permissions: ["BOOKINGS_READ_ALL"],
  sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
};

beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
});

describe("admin session boundary", () => {
  it("returns the token from a stored admin session", async () => {
    const { saveAdminSession } = await import("../../../lib/storage");
    const { requireAdminSessionToken } = await import("./admin-session");

    saveAdminSession(" session-token ", admin);

    expect(requireAdminSessionToken()).toBe("session-token");
  });

  it("stores provider workspace context separately from the session token", async () => {
    const { getStoredAdminSession, saveAdminSession, setAdminWorkspace } = await import("../../../lib/storage");

    saveAdminSession("session-token", admin);
    setAdminWorkspace({ mode: "PROVIDER", providerId: "provider-1", providerName: "Prestador 1", impersonatedByOwner: true });

    expect(getStoredAdminSession()).toMatchObject({
      sessionToken: "session-token",
      role: "OWNER",
      workspace: { mode: "PROVIDER", providerId: "provider-1", providerName: "Prestador 1", impersonatedByOwner: true },
    });
  });

  it("does not treat an owner session as full admin before workspace selection", async () => {
    const { isStoredAdminOwner, saveAdminSession, setAdminWorkspace } = await import("../../../lib/storage");

    saveAdminSession("session-token", admin);
    expect(isStoredAdminOwner()).toBe(false);

    setAdminWorkspace({ mode: "ADMIN" });
    expect(isStoredAdminOwner()).toBe(true);
  });

  it("rejects and clears an expired admin session", async () => {
    window.localStorage.setItem("calendar.admin.session", JSON.stringify({
      ...admin,
      sessionToken: "expired-token",
      sessionExpiresAt: Math.floor(Date.now() / 1000) - 1,
    }));
    const { requireAdminSessionToken } = await import("./admin-session");

    expect(() => requireAdminSessionToken()).toThrow("Admin session missing");
    expect(window.localStorage.getItem("calendar.admin.session")).toBeNull();
  });

  it("rejects when no admin session or legacy token exists", async () => {
    const { requireAdminSessionToken } = await import("./admin-session");

    expect(() => requireAdminSessionToken()).toThrow("Admin session missing");
  });
});
