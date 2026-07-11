// @vitest-environment jsdom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "../../../entities/booking";
import { getMyBookings } from "../api/get-my-bookings";
import { useMyBookings } from "./useMyBookings";

vi.mock("../api/get-my-bookings", () => ({
  getMyBookings: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function booking(id: string, startsAt: string): Booking {
  return {
    id,
    eventLink: null,
    manageToken: "manage-token",
    serviceType: "Visita tecnica",
    serviceNotes: null,
    startsAt: new Date(startsAt),
    endsAt: new Date(new Date(startsAt).getTime() + 60 * 60 * 1000),
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
    status: { code: "pending", label: "Pendente", raw: "PENDING_PHONE" },
    assignedProvider: null,
  };
}

describe("useMyBookings", () => {
  it("preserves the booking model beside its compatible legacy payload", async () => {
    const model = booking("event-1", "2026-06-10T12:00:00Z");
    vi.mocked(getMyBookings).mockResolvedValue([model]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMyBookings([" manage-token ", "manage-token"]), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMyBookings).toHaveBeenCalledTimes(1);
    expect(getMyBookings).toHaveBeenCalledWith("manage-token", expect.any(AbortSignal));
    expect(result.current.data?.[0]?.model).toBe(model);
    expect(result.current.data?.[0]?.legacy).toMatchObject({
      eventId: "event-1",
      start: "2026-06-10T12:00:00.000Z",
      status: "PENDING_PHONE",
    });

    queryClient.clear();
  });
});
