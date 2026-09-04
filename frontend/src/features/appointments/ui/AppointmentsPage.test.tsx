// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveClientProfile } from "../../../lib/storage";
import type { PublicBookingResponse } from "../../../types/api";
import AppointmentsPage from "./AppointmentsPage";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("../../bookings/api/public-bookings", () => ({
  lookupPublicBookings: mocks.lookup,
  cancelPublicBooking: mocks.cancel,
}));

vi.mock("../../public-config/hooks/usePublicBootstrap", () => ({
  usePublicBootstrap: () => ({ data: { booking: { cancellationNoticeHours: 2 } } }),
}));

vi.mock("../../../components/screens/CalendarMateRoutes", () => ({
  CalendarMateModal: ({ modal }: { modal: string | null }) => modal
    ? <div role="dialog" aria-label="Perfil do cliente">Edição do perfil</div>
    : null,
}));

const booking: PublicBookingResponse = {
  eventId: "booking-1",
  serviceType: "Serviço elétrico",
  start: "2099-09-10T13:00:00Z",
  status: "CONFIRMED",
};

function renderPage() {
  return render(<MemoryRouter><AppointmentsPage /></MemoryRouter>);
}

function saveProfilePhone(phone = "31999999999") {
  saveClientProfile({ phone });
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.lookup.mockReset().mockResolvedValue([booking]);
  mocks.cancel.mockReset();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("consulta de agendamentos pelo telefone do perfil", () => {
  it("carrega automaticamente pelo perfil sem consultar tokens antigos nem exibir pesquisa manual", async () => {
    window.localStorage.setItem("calendar.manageTokens", JSON.stringify(["token-expirado"]));
    saveProfilePhone();

    const firstView = renderPage();

    await waitFor(() => expect(mocks.lookup).toHaveBeenCalledWith("31999999999"));
    expect(await screen.findByText("Serviço elétrico")).toBeTruthy();
    expect(screen.queryByLabelText(/telefone/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /ver agendamentos|view bookings/i })).toBeNull();
    expect(screen.queryByText("token-expirado")).toBeNull();

    firstView.unmount();
    renderPage();
    await waitFor(() => expect(mocks.lookup).toHaveBeenCalledTimes(2));
    expect(mocks.lookup).toHaveBeenLastCalledWith("31999999999");
    expect(await screen.findByText("Serviço elétrico")).toBeTruthy();
  });

  it("orienta a completar o perfil quando não há telefone e abre sua edição", async () => {
    renderPage();

    expect(screen.getByText("Adicione um telefone ao seu perfil para visualizar seus agendamentos.")).toBeTruthy();
    expect(mocks.lookup).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Completar perfil" }));
    expect(await screen.findByRole("dialog", { name: "Perfil do cliente" })).toBeTruthy();
  });

  it("limpa os resultados e faz uma nova consulta quando o telefone do perfil muda", async () => {
    let resolveSecondLookup!: (value: PublicBookingResponse[]) => void;
    const secondBooking = { ...booking, eventId: "booking-2", serviceType: "Serviço hidráulico" };
    mocks.lookup
      .mockResolvedValueOnce([booking])
      .mockReturnValueOnce(new Promise<PublicBookingResponse[]>((resolve) => { resolveSecondLookup = resolve; }));
    saveProfilePhone();
    renderPage();
    expect(await screen.findByText("Serviço elétrico")).toBeTruthy();

    act(() => saveProfilePhone("31988888888"));

    await waitFor(() => expect(mocks.lookup).toHaveBeenLastCalledWith("31988888888"));
    expect(screen.queryByText("Serviço elétrico")).toBeNull();
    expect(screen.getByText("Carregando agendamentos")).toBeTruthy();

    await act(async () => resolveSecondLookup([secondBooking]));
    expect(await screen.findByText("Serviço hidráulico")).toBeTruthy();
    expect(screen.queryByText("Serviço elétrico")).toBeNull();
  });

  it("mantém dados privados fora da consulta e coloca o contato específico dentro do card", async () => {
    mocks.lookup.mockResolvedValue([{
      ...booking,
      clientEmail: "privado@example.test",
      serviceNotes: "Observação privada",
      clientAddressLine: "Endereço privado",
    } as PublicBookingResponse]);
    saveProfilePhone();
    renderPage();

    expect(await screen.findByText("Serviço elétrico")).toBeTruthy();
    expect(screen.getByText("Confirmado")).toBeTruthy();
    expect(screen.queryByText("privado@example.test")).toBeNull();
    expect(screen.queryByText("Observação privada")).toBeNull();
    expect(screen.queryByText("Endereço privado")).toBeNull();

    const card = screen.getByText("Serviço elétrico").closest("article");
    expect(card?.textContent).toContain("Para alterar informações ou conferir mais detalhes sobre este agendamento, entre em contato com o prestador.");
    const contact = screen.getByRole("link", { name: "Falar com o prestador" });
    expect(card?.contains(contact)).toBe(true);
    const contactUrl = new URL(contact.getAttribute("href") ?? "");
    expect(contactUrl.origin).toBe("https://wa.me");
    expect(contactUrl.searchParams.get("text")).toBe("Serviço: Serviço elétrico\nData: 10/09/2099\nHorário: 10:00");
  });

  it("confirma o cancelamento uma única vez e atualiza o status imediatamente", async () => {
    let resolveCancellation!: (value: PublicBookingResponse) => void;
    mocks.cancel.mockReturnValue(new Promise<PublicBookingResponse>((resolve) => { resolveCancellation = resolve; }));
    saveProfilePhone();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    const confirm = screen.getByRole("button", { name: "Confirmar cancelamento" });
    expect(screen.getByRole("dialog").textContent).toContain("Serviço elétrico");
    expect(screen.getByText("Tem certeza de que deseja cancelar este agendamento?")).toBeTruthy();
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.cancel).toHaveBeenCalledWith("booking-1", "31999999999");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    await act(async () => resolveCancellation({ ...booking, status: "CANCELLED" }));
    await waitFor(() => expect(screen.getByText("Cancelado")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Falar com o prestador" })).toBeTruthy();
  });

  it("mostra em português a mensagem de rate limiting", async () => {
    mocks.lookup.mockRejectedValue({ status: 429, code: "RATE_LIMITED", message: "Too Many Requests" });
    saveProfilePhone();
    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  });
});
