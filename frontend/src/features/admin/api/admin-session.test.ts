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
