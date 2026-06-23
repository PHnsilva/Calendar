// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapBookingDto } from "../../../entities/booking";
import { formatDateTime } from "../../../lib/dates";
import type { ServicoResponse } from "../../../types/api";
import { BookingListItem } from "./BookingListItem";

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
const booking = mapBookingDto(legacyBooking);

describe("BookingListItem", () => {
  it("renders entity-backed booking fields without changing selection behavior", () => {
    const onSelect = vi.fn();
    render(<BookingListItem booking={booking} isActive onSelect={onSelect} />);

    expect(screen.getByText("Visita tecnica")).toBeTruthy();
    expect(screen.getByText(formatDateTime(booking.startsAt))).toBeTruthy();
    expect(screen.getByText("Rua Sao Jose, 123 - Centro - Itabirito/MG")).toBeTruthy();
    expect(screen.getByText("Pendente")).toBeTruthy();

    const item = screen.getByRole("button");
    expect(item.classList.contains("my-bookings__item--active")).toBe(true);
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
