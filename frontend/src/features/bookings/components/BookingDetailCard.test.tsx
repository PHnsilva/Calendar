// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "../../../entities/booking";
import { BookingDetailCard } from "./BookingDetailCard";

vi.mock("../hooks/useBookingMutations", () => ({
  useBookingMutations: () => ({
    updateBooking: vi.fn(),
    deleteBooking: vi.fn(),
    isUpdating: false,
    isDeleting: false,
    updateError: null,
    deleteError: null,
  }),
}));

beforeEach(() => {
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

    const view = render(<BookingDetailCard booking={first} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar / reagendar" }));
    expect(screen.getByDisplayValue("Visita tecnica")).toBeTruthy();

    view.rerender(<BookingDetailCard booking={second} />);

    expect(screen.queryByDisplayValue("Visita tecnica")).toBeNull();
    expect(screen.getByRole("heading", { name: "Instalacao" })).toBeTruthy();
    expect(screen.getByText("Maria Souza")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar / reagendar" })).toBeTruthy();
  });
});
