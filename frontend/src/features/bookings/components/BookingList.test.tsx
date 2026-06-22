// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapBookingDto } from "../../../entities/booking";
import type { ServicoResponse } from "../../../types/api";
import { BookingList } from "./BookingList";

afterEach(cleanup);

const legacyBooking: ServicoResponse = {
  eventId: "event-1",
  eventLink: "https://calendar.test/event-1",
  serviceType: "Visita tecnica",
  serviceNotes: "Trocar tomada",
  start: "2026-06-10T12:00:00Z",
  end: "2026-06-10T13:00:00Z",
  clientFirstName: "Pedro",
  clientLastName: "Silva",
  clientEmail: "pedro@example.com",
  clientPhone: "31999999999",
  clientCep: "35450000",
  clientStreet: "Rua Sao Jose",
  clientNeighborhood: "Centro",
  clientNumber: "123",
  clientComplement: "Apto 101",
  clientCity: "Itabirito",
  clientState: "MG",
  clientAddressLine: "Rua Sao Jose, 123 - Centro - Itabirito/MG",
  status: "PENDING_PHONE",
};

describe("BookingList", () => {
  it("renders the preserved model while returning the legacy selection payload", () => {
    const onSelect = vi.fn();
    const model = mapBookingDto(legacyBooking);
    const legacySelection = { ...legacyBooking, serviceType: "Legacy selection payload" };
    render(
      <BookingList
        bookings={[{ model, legacy: legacySelection }]}
        selectedEventId={legacyBooking.eventId}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Visita tecnica")).toBeTruthy();
    expect(screen.getByText("Rua Sao Jose, 123 - Centro - Itabirito/MG")).toBeTruthy();
    expect(screen.queryByText("Legacy selection payload")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(legacySelection);
  });
});
