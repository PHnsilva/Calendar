// @vitest-environment jsdom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "../../../entities/booking";
import type { BookingListEntry } from "../types";
import { deleteBooking } from "../api/delete-booking";
import { useBookingMutations } from "./useBookingMutations";

vi.mock("../api/delete-booking", () => ({
  deleteBooking: vi.fn(),
}));

vi.mock("../api/update-booking", () => ({
  updateBooking: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function booking(id: string): Booking {
  return {
    id,
    eventLink: null,
    manageToken: "manage-token",
    serviceType: "Visita tecnica",
    serviceNotes: null,
    startsAt: new Date("2026-07-12T12:00:00Z"),
    endsAt: new Date("2026-07-12T13:00:00Z"),
    client: {
      firstName: "Pedro",
      lastName: "Silva",
      fullName: "Pedro Silva",
      email: null,
      phone: "31999999999",
      address: {
        postalCode: null,
        street: null,
        neighborhood: null,
        number: null,
        complement: null,
        city: "Itabirito",
        state: "MG",
        latitude: null,
        longitude: null,
        formatted: "Itabirito/MG",
      },
    },
    status: { code: "confirmed", label: "Confirmado", raw: "CONFIRMED" },
    assignedProvider: null,
  };
}

function entry(model: Booking): BookingListEntry {
  return {
    model,
    legacy: {
      eventId: model.id,
      eventLink: "",
      serviceType: model.serviceType,
      serviceNotes: "",
      start: model.startsAt.toISOString(),
      end: model.endsAt.toISOString(),
      clientFirstName: model.client.firstName,
      clientLastName: model.client.lastName,
      clientEmail: "",
      clientPhone: model.client.phone ?? "",
      clientCep: "",
      clientStreet: "",
      clientNeighborhood: "",
      clientNumber: "",
      clientCity: model.client.address.city ?? "",
      clientState: model.client.address.state ?? "",
      clientAddressLine: model.client.address.formatted,
      status: model.status.raw,
    },
  };
}

describe("useBookingMutations", () => {
  it("removes a cancelled booking from my-bookings cache immediately", async () => {
    vi.mocked(deleteBooking).mockResolvedValue(undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData<BookingListEntry[]>(["my-bookings", ["manage-token"]], [
      entry(booking("event-1")),
      entry(booking("event-2")),
    ]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useBookingMutations(), { wrapper });
    await result.current.deleteBooking({ eventId: "event-1", token: "manage-token" });

    await waitFor(() => {
      const current = queryClient.getQueryData<BookingListEntry[]>(["my-bookings", ["manage-token"]]);
      expect(current?.map((item) => item.model.id)).toEqual(["event-2"]);
    });

    queryClient.clear();
  });
});
