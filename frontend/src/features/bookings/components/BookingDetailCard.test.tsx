// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "../../../entities/booking";
import { BookingDetailCard } from "./BookingDetailCard";

const mutations = vi.hoisted(() => ({ updateBooking: vi.fn(), deleteBooking: vi.fn() }));

vi.mock("../hooks/useBookingMutations", () => ({
  useBookingMutations: () => ({
    updateBooking: mutations.updateBooking,
    deleteBooking: mutations.deleteBooking,
    isUpdating: false,
    isDeleting: false,
    updateError: null,
    deleteError: null,
  }),
}));

vi.mock("../../public-config/hooks/usePublicBootstrap", () => ({
  usePublicBootstrap: () => ({ data: { booking: { cancellationNoticeHours: 2 } } }),
}));

beforeEach(() => {
  mutations.updateBooking.mockReset().mockResolvedValue(undefined);
  mutations.deleteBooking.mockReset().mockResolvedValue(undefined);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-01T12:00:00Z"));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
});

function booking(id: string, overrides: Partial<Booking> = {}): Booking {
  const startsAt = overrides.startsAt ?? new Date("2026-07-10T15:00:00Z");
  return {
    id,
    eventLink: `https://calendar.test/${id}`,
    manageToken: "manage-token",
    serviceType: "Visita tecnica",
    serviceNotes: "Trocar tomada",
    startsAt,
    endsAt: overrides.endsAt ?? new Date(startsAt.getTime() + 60 * 60 * 1000),
    client: {
      firstName: "Pedro",
      lastName: "Silva",
      fullName: "Pedro Silva",
      email: "pedro@example.com",
      phone: "31999999999",
      address: {
        postalCode: "35450000",
        street: "Rua Sao Jose",
        neighborhood: "Centro",
        number: "123",
        complement: "Apto 101",
        city: "Itabirito",
        state: "MG",
        latitude: null,
        longitude: null,
        formatted: "Rua Sao Jose, 123 - Centro - Itabirito/MG",
      },
    },
    status: { code: "pending", label: "Pendente", raw: "PENDING_PHONE" },
    assignedProvider: null,
    ...overrides,
  };
}

describe("BookingDetailCard", () => {
  it("renders the entity-backed booking details", () => {
    render(<BookingDetailCard booking={booking("event-1")} />);

    expect(screen.getByRole("heading", { name: "Visita tecnica" })).toBeTruthy();
    expect(screen.getByText("Pedro Silva")).toBeTruthy();
    expect(screen.getByText("pedro@example.com")).toBeTruthy();
    expect(screen.getByText("31999999999")).toBeTruthy();
    expect(screen.getByText("Rua Sao Jose, 123 - Centro - Itabirito/MG")).toBeTruthy();
    expect(screen.getByText("Itabirito - MG")).toBeTruthy();
    expect(screen.getAllByText("Pendente").length).toBeGreaterThanOrEqual(1);
  });

  it("resets edit state when the selected booking changes", () => {
    const first = booking("event-1");
    const second = booking("event-2", {
      serviceType: "Instalacao",
      client: {
        ...first.client,
        fullName: "Maria Souza",
        firstName: "Maria",
        lastName: "Souza",
      },
    });

    const view = render(<BookingDetailCard booking={first} initialMode="edit" />);
    expect(screen.getByDisplayValue("Visita tecnica")).toBeTruthy();

    view.rerender(<BookingDetailCard booking={second} initialMode="view" />);

    expect(screen.queryByDisplayValue("Visita tecnica")).toBeNull();
    expect(screen.getByRole("heading", { name: "Instalacao" })).toBeTruthy();
    expect(screen.getByText("Maria Souza")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Editar|reagendar/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("preserves existing service notes when another field is updated", () => {
    render(<BookingDetailCard booking={booking("event-1")} initialMode="edit" />);

    fireEvent.change(screen.getByDisplayValue("pedro@example.com"), { target: { value: "novo@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(mutations.updateBooking).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        clientEmail: "novo@example.com",
        serviceNotes: "Trocar tomada",
      }),
    }));
  });
});
