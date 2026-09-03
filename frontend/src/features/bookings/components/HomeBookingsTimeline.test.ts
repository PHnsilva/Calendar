import { describe, expect, it } from "vitest";
import type { ServicoResponse } from "../../../types/api";
import { buildHomeBookingUpdatePayload } from "./home-booking-update";

describe("HomeBookingsTimeline update payload", () => {
  it("keeps service notes and the address complement when editing unrelated fields", () => {
    const booking = {
      eventId: "booking-1",
      serviceType: "Electrical service",
      serviceNotes: "Use the side entrance.",
      clientStreet: "Rua Um",
      clientNumber: "10",
      clientNeighborhood: "Centro",
      clientCep: "35450000",
      clientComplement: "Apartment 12",
      clientCity: "Itabirito",
      clientState: "MG",
      clientLatitude: -20.2,
      clientLongitude: -43.8,
    } as ServicoResponse;

    const payload = buildHomeBookingUpdatePayload(booking, {
      serviceType: "Electrical service",
      date: "2026-09-10",
      time: "10:00",
      fullName: "Maria Souza",
      email: "updated@example.test",
      phone: "31999999999",
      street: "Rua Um",
      number: "10",
    });

    expect(payload.serviceNotes).toBe("Use the side entrance.");
    expect(payload.clientComplement).toBe("Apartment 12");
    expect(payload.clientEmail).toBe("updated@example.test");
  });
});
