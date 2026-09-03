// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "../../../entities/booking";
import { toLegacyBookingResponse } from "../adapters/to-legacy-booking-response";
import { BookingWorkspace } from "./BookingWorkspace";

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

vi.mock("../../public-config/hooks/usePublicBootstrap", () => ({
  usePublicBootstrap: () => ({ data: { booking: { cancellationNoticeHours: 2 } } }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function booking(id: string, serviceType: string): Booking {
  return {
    id,
    eventLink: `https://calendar.test/${id}`,
    manageToken: "manage-token",
    serviceType,
    serviceNotes: "Trocar tomada",
    startsAt: new Date(`2026-07-${id === "event-1" ? "10" : "11"}T15:00:00Z`),
    endsAt: new Date(`2026-07-${id === "event-1" ? "10" : "11"}T16:00:00Z`),
    client: {
      firstName: id === "event-1" ? "Pedro" : "Maria",
      lastName: id === "event-1" ? "Silva" : "Souza",
      fullName: id === "event-1" ? "Pedro Silva" : "Maria Souza",
      email: id === "event-1" ? "pedro@example.com" : "maria@example.com",
      phone: "31999999999",
      address: {
        postalCode: "35450000",
        street: "Rua Sao Jose",
        neighborhood: "Centro",
        number: "123",
        complement: null,
        city: "Itabirito",
        state: "MG",
        latitude: null,
        longitude: null,
        formatted: "Rua Sao Jose, 123 - Centro - Itabirito/MG",
      },
    },
    status: { code: "pending", label: "Pendente", raw: "PENDING_PHONE" },
    assignedProvider: null,
  };
}

describe("BookingWorkspace", () => {
  it("switches the detail pane to the selected booking while keeping the list boundary intact", () => {
    const first = booking("event-1", "Visita tecnica");
    const second = booking("event-2", "Instalacao");

    render(
      <BookingWorkspace
        bookings={[
          { model: first, legacy: toLegacyBookingResponse(first) },
          { model: second, legacy: toLegacyBookingResponse(second) },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Visita tecnica" })).toBeTruthy();

    fireEvent.click(screen.getByText("Instalacao").closest("button") as HTMLButtonElement);

    expect(screen.getByRole("heading", { name: "Instalacao" })).toBeTruthy();
    expect(screen.getByText("Maria Souza")).toBeTruthy();
  });
});
