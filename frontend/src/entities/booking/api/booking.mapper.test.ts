import { describe, expect, it } from "vitest";
import type { BookingDto } from "./booking.dto";
import { mapBookingDto } from "./booking.mapper";
import { mapBookingStatus } from "../model/booking-status";

const dto: BookingDto = {
  eventId: " event-1 ",
  eventLink: " https://calendar.test/event-1 ",
  serviceType: " Visita tecnica ",
  serviceNotes: " Trocar tomada ",
  start: "2026-06-10T12:00:00Z",
  end: "2026-06-10T13:00:00Z",
  clientFirstName: " Pedro ",
  clientLastName: " Silva ",
  clientEmail: " pedro@example.com ",
  clientPhone: " 31999999999 ",
  clientCep: "35450000",
  clientStreet: "Rua Sao Jose",
  clientNeighborhood: "Centro",
  clientNumber: "123",
  clientComplement: "Apto 101",
  clientCity: "Itabirito",
  clientState: "MG",
  clientLatitude: -20.25,
  clientLongitude: -43.8,
  clientAddressLine: null,
  status: "CONFIRMED",
  manageToken: " manage-token ",
  assignedProviderId: " provider-1 ",
  assignedProviderName: " Maria ",
  assignedProviderPhone: " 31988888888 ",
};

describe("mapBookingDto", () => {
  it("maps backend names, dates, address, status, and provider to the frontend model", () => {
    const booking = mapBookingDto(dto);

    expect(booking).toMatchObject({
      id: "event-1",
      serviceType: "Visita tecnica",
      serviceNotes: "Trocar tomada",
      manageToken: "manage-token",
      client: {
        fullName: "Pedro Silva",
        address: {
          formatted: "Rua Sao Jose, 123 - Centro - Itabirito/MG",
          latitude: -20.25,
          longitude: -43.8,
        },
      },
      status: { code: "confirmed", label: "Confirmado", raw: "CONFIRMED" },
      assignedProvider: { id: "provider-1", name: "Maria", phone: "31988888888" },
    });
    expect(booking.startsAt).toEqual(new Date("2026-06-10T12:00:00Z"));
    expect(booking.endsAt).toEqual(new Date("2026-06-10T13:00:00Z"));
  });

  it("rejects invalid required dates", () => {
    expect(() => mapBookingDto({ ...dto, start: "not-a-date" })).toThrowError(
      new TypeError("Invalid booking start"),
    );
  });
});

describe("mapBookingStatus", () => {
  it.each([
    ["PENDING_PHONE", "pending", "Pendente"],
    ["CONFIRMED", "confirmed", "Confirmado"],
    ["CANCELLED", "cancelled", "Cancelado"],
  ] as const)("maps %s to the frontend status", (raw, code, label) => {
    expect(mapBookingStatus(raw)).toEqual({ raw, code, label });
  });

  it("preserves an unknown backend status as the display fallback", () => {
    expect(mapBookingStatus("RESCHEDULED")).toEqual({
      code: "unknown",
      label: "RESCHEDULED",
      raw: "RESCHEDULED",
    });
  });

  it("maps a missing status to an empty unknown status", () => {
    expect(mapBookingStatus(null)).toEqual({ code: "unknown", label: "", raw: "" });
  });
});
