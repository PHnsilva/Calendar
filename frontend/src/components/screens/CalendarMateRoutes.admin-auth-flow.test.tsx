// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { AdminAuthConfirmResponse, AdminProviderResponse } from "../../types/api";

vi.setConfig({ testTimeout: 30000 });

const adminAuthMocks = vi.hoisted(() => ({
  confirmAdminLogin: vi.fn(),
  listAdminProviders: vi.fn(),
  loginAdminWithPassword: vi.fn(),
  resendAdminLogin: vi.fn(),
  startAdminLogin: vi.fn(),
}));

vi.mock("../../features/admin/api/admin-auth", () => adminAuthMocks);

const ownerResponse: AdminAuthConfirmResponse = {
  sessionToken: "owner-session",
  admin: {
    id: "owner-1",
    name: "SG Admin",
    phone: "31999999999",
    role: "OWNER",
    permissions: ["BOOKINGS_READ_ALL"],
    sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
  },
};

const provider: AdminProviderResponse = {
  id: "provider-1",
  name: "Prestador 1",
  phone: "31900000001",
  role: "PROVIDER",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}{location.search}</span>;
}

async function renderProfileModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onClose = vi.fn();
  const { CalendarMateModal } = await import("./CalendarMateRoutes");

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <CalendarMateModal modal="client-profile" onClose={onClose} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { onClose };
}

async function fillAdminPasswordForm(password = "team-password") {
  fireEvent.change(screen.getAllByLabelText("Telefone")[0] as HTMLInputElement, {
    target: { value: "31999999999" },
  });
  fireEvent.change(await screen.findByLabelText("Senha da equipe"), {
    target: { value: password },
  });
}

beforeEach(() => {
  cleanup();
  vi.resetModules();
  vi.stubEnv("VITE_OWNER_ADMIN_PHONES", "31999999999");
  window.localStorage.clear();
  adminAuthMocks.confirmAdminLogin.mockReset();
  adminAuthMocks.listAdminProviders.mockReset();
  adminAuthMocks.loginAdminWithPassword.mockReset();
  adminAuthMocks.resendAdminLogin.mockReset();
  adminAuthMocks.startAdminLogin.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  window.localStorage.clear();
});

describe("CalendarMate admin password profile flow", () => {
  it("opens role selection immediately after password validation and avoids duplicate login requests", async () => {
    const login = deferred<AdminAuthConfirmResponse>();
    const providers = deferred<AdminProviderResponse[]>();
    adminAuthMocks.loginAdminWithPassword.mockReturnValue(login.promise);
    adminAuthMocks.listAdminProviders.mockReturnValue(providers.promise);
    await renderProfileModal();
    await fillAdminPasswordForm();

    const submit = screen.getByRole("button", { name: /Validar acesso/i });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(adminAuthMocks.loginAdminWithPassword).toHaveBeenCalledTimes(1);

    login.resolve(ownerResponse);

    expect(await screen.findByText("Escolha o workspace")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Entrar como Admin/i })).toBeTruthy();
    expect(screen.queryByText(/Salvando/i)).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Carregando prestadores");

    providers.resolve([provider]);

    expect(await screen.findByRole("button", { name: /Entrar como Prestador 1/i })).toBeTruthy();
  }, 30000);

  it("navigates to the selected admin dashboard from role selection", async () => {
    adminAuthMocks.loginAdminWithPassword.mockResolvedValue(ownerResponse);
    adminAuthMocks.listAdminProviders.mockReturnValue(new Promise<AdminProviderResponse[]>(() => undefined));
    await renderProfileModal();
    await fillAdminPasswordForm();

    fireEvent.click(screen.getByRole("button", { name: /Validar acesso/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Entrar como Admin/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/admin/dashboard?view=agendamentos");
    });
  }, 30000);

  it("keeps role selection available when providers cannot be loaded", async () => {
    adminAuthMocks.loginAdminWithPassword.mockResolvedValue(ownerResponse);
    adminAuthMocks.listAdminProviders.mockRejectedValue(new Error("upstream unavailable"));
    await renderProfileModal();
    await fillAdminPasswordForm();

    fireEvent.click(screen.getByRole("button", { name: /Validar acesso/i }));

    expect(await screen.findByText("Escolha o workspace")).toBeTruthy();
    expect(await screen.findByText("Não foi possível carregar os prestadores agora. Você ainda pode entrar como Admin.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Entrar como Admin/i })).toBeTruthy();
    expect(screen.queryByText("Senha incorreta. Confira e tente novamente.")).toBeNull();
  }, 30000);

  it("navigates to the selected provider dashboard from role selection", async () => {
    adminAuthMocks.loginAdminWithPassword.mockResolvedValue(ownerResponse);
    adminAuthMocks.listAdminProviders.mockResolvedValue([provider]);
    await renderProfileModal();
    await fillAdminPasswordForm();

    fireEvent.click(screen.getByRole("button", { name: /Validar acesso/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Entrar como Prestador 1/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe("/prestador/dashboard?view=agendamentos");
    });
  }, 30000);

  it("shows an invalid password message and returns control to the profile form", async () => {
    adminAuthMocks.loginAdminWithPassword.mockRejectedValue({
      status: 403,
      code: "INVALID_ADMIN_PASSWORD",
      message: "Senha incorreta. Confira e tente novamente.",
      field: "password",
      retryable: false,
    });
    await renderProfileModal();
    await fillAdminPasswordForm("wrong-password");

    fireEvent.click(screen.getByRole("button", { name: /Validar acesso/i }));

    expect(await screen.findByText("Senha incorreta. Confira e tente novamente.")).toBeTruthy();
    expect(screen.queryByText("Escolha o workspace")).toBeNull();
    expect((screen.getByRole("button", { name: /Validar acesso/i }) as HTMLButtonElement).disabled).toBe(false);
    expect(window.localStorage.getItem("calendar.admin.session")).toBeNull();
  }, 30000);
});
