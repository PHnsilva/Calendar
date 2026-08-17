import { describe, expect, it } from "vitest";
import type { Booking } from "../../../entities/booking";
import type { BookingListEntry } from "../../bookings/types";
import { buildRebookingPrefill, partitionClientBookings } from "./booking-history";

function booking(id: string, startsAt: string, endsAt: string): Booking {
  return {
    id,
    eventLink: "https://calendar.test/original",
    manageToken: "original-manage-token",
    serviceType: "Elétrica",
    serviceNotes: "Dados operacionais antigos",
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    client: {
      firstName: "Maria",
      lastName: "Souza",
      fullName: "Maria Souza",
      email: "maria@example.test",
      phone: "31988888888",
      address: {
        postalCode: "35450000",
        street: "Rua Um",
        neighborhood: "Centro",
        number: "10",
        complement: "Casa",
        city: "Itabirito",
        state: "MG",
        latitude: -20.25,
        longitude: -43.8,
        formatted: "Rua Um, 10 - Centro",
      },
    },
    status: { code: "confirmed", label: "Confirmado", raw: "CONFIRMED" },
    assignedProvider: { id: "provider-1", name: "Prestador", phone: "31999999999" },
  };
}

function entry(model: Booking): BookingListEntry {
  return { model, legacy: {} as BookingListEntry["legacy"] };
}

describe("client booking history", () => {
  it("returns an explicit empty history when the client only has future appointments", () => {
    const future = entry(booking("future", "2026-08-20T12:00:00Z", "2026-08-20T13:00:00Z"));

    const result = partitionClientBookings([future], new Date("2026-08-17T12:00:00Z"));

    expect(result.upcoming.map(({ model }) => model.id)).toEqual(["future"]);
    expect(result.history).toEqual([]);
  });

  it("builds a new-booking prefill from a past appointment without copying scheduling or management data", () => {
    const past = booking("past-event", "2026-08-10T12:00:00Z", "2026-08-10T13:00:00Z");

    const prefill = buildRebookingPrefill(past);

    expect(prefill).toEqual({
      serviceType: "Elétrica",
      client: { fullName: "Maria Souza", phone: "31988888888", email: "maria@example.test" },
      address: {
        postalCode: "35450000",
        street: "Rua Um",
        neighborhood: "Centro",
        number: "10",
        complement: "Casa",
        city: "Itabirito",
        state: "MG",
        latitude: -20.25,
        longitude: -43.8,
      },
    });
    expect(prefill).not.toHaveProperty("id");
    expect(prefill).not.toHaveProperty("startsAt");
    expect(prefill).not.toHaveProperty("endsAt");
    expect(prefill).not.toHaveProperty("status");
    expect(prefill).not.toHaveProperty("manageToken");
    expect(prefill).not.toHaveProperty("assignedProvider");
    expect(prefill).not.toHaveProperty("serviceNotes");
  });
});
