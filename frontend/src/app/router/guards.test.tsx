// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "../providers/auth-provider";
import { ApiError } from "../../lib/api-client";
import { saveAdminSession, setAdminWorkspace } from "../../lib/storage";
import type { AdminMeResponse, AdminWorkspaceMode } from "../../types/api";
import { AdminRouteGuard } from "./guards";

const adminAuthMocks = vi.hoisted(() => ({
  getAdminMe: vi.fn(),
}));

vi.mock("../../features/admin/api/admin-auth", () => ({
  getAdminMe: adminAuthMocks.getAdminMe,
}));

const owner: AdminMeResponse = {
  id: "owner-1",
  name: "Admin",
  phone: "31999999999",
  role: "OWNER",
  permissions: ["BOOKINGS_READ_ALL"],
  sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderProtectedRoute(path: string, requiredWorkspace: AdminWorkspaceMode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<LocationProbe />} />
          <Route element={<AdminRouteGuard requiredWorkspace={requiredWorkspace} />}>
            <Route path="/admin" element={<><span>Admin protegido</span><LocationProbe /></>} />
            <Route path="/prestador" element={<><span>Prestador protegido</span><LocationProbe /></>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  adminAuthMocks.getAdminMe.mockReset();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("admin protected routes", () => {
  it("allows a valid persisted admin session and keeps access after remount", async () => {
    saveAdminSession("session-token", owner);
    setAdminWorkspace({ mode: "ADMIN" });
    adminAuthMocks.getAdminMe.mockResolvedValue(owner);

    const firstRender = renderProtectedRoute("/admin", "ADMIN");
    expect(await screen.findByText("Admin protegido")).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/admin");

    firstRender.unmount();
    renderProtectedRoute("/admin", "ADMIN");
    expect(await screen.findByText("Admin protegido")).toBeTruthy();
    expect(adminAuthMocks.getAdminMe).toHaveBeenCalledTimes(2);
  });

  it("allows the persisted provider workspace on the provider route", async () => {
    saveAdminSession("session-token", owner);
    setAdminWorkspace({ mode: "PROVIDER", providerId: "provider-1", providerName: "Prestador 1", impersonatedByOwner: true });
    adminAuthMocks.getAdminMe.mockResolvedValue(owner);

    renderProtectedRoute("/prestador", "PROVIDER");

    expect(await screen.findByText("Prestador protegido")).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/prestador");
  });

  it("clears a server-rejected session and redirects home", async () => {
    saveAdminSession("rejected-token", owner);
    setAdminWorkspace({ mode: "ADMIN" });
    adminAuthMocks.getAdminMe.mockRejectedValue(new ApiError("Sessão expirada", 401, null));

    renderProtectedRoute("/admin", "ADMIN");

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/"));
    expect(window.localStorage.getItem("calendar.admin.session")).toBeNull();
  });

  it("redirects an expired local session without validating it upstream", async () => {
    window.localStorage.setItem("calendar.admin.session", JSON.stringify({
      ...owner,
      sessionToken: "expired-token",
      sessionExpiresAt: Math.floor(Date.now() / 1000) - 1,
      workspace: { mode: "ADMIN" },
    }));

    renderProtectedRoute("/admin", "ADMIN");

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/"));
    expect(adminAuthMocks.getAdminMe).not.toHaveBeenCalled();
  });

  it("keeps an unexpired session when validation is temporarily unavailable", async () => {
    saveAdminSession("session-token", owner);
    setAdminWorkspace({ mode: "ADMIN" });
    adminAuthMocks.getAdminMe.mockRejectedValue(new Error("service unavailable"));

    renderProtectedRoute("/admin", "ADMIN");

    expect(await screen.findByText("Admin protegido")).toBeTruthy();
    expect(window.localStorage.getItem("calendar.admin.session")).not.toBeNull();
  });
});
