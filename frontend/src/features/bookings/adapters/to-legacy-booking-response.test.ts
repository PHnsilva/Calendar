import { describe, expect, it } from "vitest";
import type { Booking } from "../../../entities/booking";
import { toLegacyBookingResponse } from "./to-legacy-booking-response";

describe("toLegacyBookingResponse", () => {
  it("preserves the existing booking component contract after entity mapping", () => {
    const booking: Booking = {
      id: "event-1",
      eventLink: "https://calendar.test/event-1",
      manageToken: "manage-token",
      serviceType: "Visita tecnica",
      serviceNotes: "Trocar tomada",
      startsAt: new Date("2026-06-10T12:00:00Z"),
      endsAt: new Date("2026-06-10T13:00:00Z"),
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
          latitude: -20.25,
          longitude: -43.8,
          formatted: "Rua Sao Jose, 123 - Centro - Itabirito/MG",
        },
      },
      status: { code: "confirmed", label: "Confirmado", raw: "CONFIRMED" },
      assignedProvider: { id: "provider-1", name: "Maria", phone: "31988888888" },
    };

    expect(toLegacyBookingResponse(booking)).toEqual({
      eventId: "event-1",
      eventLink: "https://calendar.test/event-1",
      serviceType: "Visita tecnica",
      serviceNotes: "Trocar tomada",
      start: "2026-06-10T12:00:00.000Z",
      end: "2026-06-10T13:00:00.000Z",
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
      clientLatitude: -20.25,
      clientLongitude: -43.8,
      clientAddressLine: "Rua Sao Jose, 123 - Centro - Itabirito/MG",
      status: "CONFIRMED",
      manageToken: "manage-token",
      assignedProviderId: "provider-1",
      assignedProviderName: "Maria",
      assignedProviderPhone: "31988888888",
    });
  });
});
