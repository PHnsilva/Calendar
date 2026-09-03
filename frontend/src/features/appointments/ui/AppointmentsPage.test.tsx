// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicBookingResponse } from "../../../types/api";
import AppointmentsPage from "./AppointmentsPage";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("../../bookings/api/public-bookings", () => ({
  lookupPublicBookings: mocks.lookup,
  cancelPublicBooking: mocks.cancel,
}));

vi.mock("../../public-config/hooks/usePublicBootstrap", () => ({
  usePublicBootstrap: () => ({ data: { booking: { cancellationNoticeHours: 2 } } }),
}));

const booking: PublicBookingResponse = {
  eventId: "booking-1",
  serviceType: "Electrical service",
  start: "2099-09-10T13:00:00Z",
  status: "CONFIRMED",
};

function renderPage() {
  return render(<MemoryRouter><AppointmentsPage /></MemoryRouter>);
}

async function submitPhone(phone = "31999999999") {
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: phone } });
  fireEvent.click(screen.getByRole("button", { name: "View bookings" }));
  await waitFor(() => expect(mocks.lookup).toHaveBeenCalled());
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.lookup.mockReset().mockResolvedValue([booking]);
  mocks.cancel.mockReset();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("phone-only booking lookup", () => {
  it("finds bookings without local tokens and still works after storage is cleared and the page reopens", async () => {
    window.localStorage.setItem("calendar.manageTokens", JSON.stringify(["expired-token"]));
    const firstView = renderPage();
    await submitPhone();

    expect(mocks.lookup).toHaveBeenLastCalledWith("31999999999");
    expect(await screen.findByText("Electrical service")).toBeTruthy();
    expect(screen.queryByText("expired-token")).toBeNull();

    firstView.unmount();
    window.localStorage.clear();
    renderPage();
    expect((screen.getByLabelText("Phone number") as HTMLInputElement).value).toBe("");
    await submitPhone("(31) 99999-9999");

    expect(mocks.lookup).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Electrical service")).toBeTruthy();
  });

  it("renders only approved booking information and the centralized provider contact", async () => {
    mocks.lookup.mockResolvedValue([{ ...booking, clientEmail: "private@example.test", serviceNotes: "Private note", clientAddressLine: "Private address" }]);
    renderPage();
    await submitPhone();

    expect(await screen.findByText("Electrical service")).toBeTruthy();
    expect(screen.getByText("Confirmed")).toBeTruthy();
    expect(screen.queryByText("private@example.test")).toBeNull();
    expect(screen.queryByText("Private note")).toBeNull();
    expect(screen.queryByText("Private address")).toBeNull();
    expect(screen.queryByRole("button", { name: /edit|change|reschedule/i })).toBeNull();
    expect(screen.getByText("If you would like to change any information or check additional booking details, please contact the service provider.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Contact the provider" }).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
  });

  it("confirms cancellation once and immediately replaces the booking status", async () => {
    let resolveCancellation!: (value: PublicBookingResponse) => void;
    mocks.cancel.mockReturnValue(new Promise<PublicBookingResponse>((resolve) => { resolveCancellation = resolve; }));
    renderPage();
    await submitPhone();
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    const confirm = screen.getByRole("button", { name: "Confirm cancellation" });
    expect(screen.getByRole("dialog").textContent).toContain("Electrical service");
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.cancel).toHaveBeenCalledWith("booking-1", "31999999999");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    await act(async () => resolveCancellation({ ...booking, status: "CANCELLED" }));
    await waitFor(() => expect(screen.getByText("Cancelled")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("shows a friendly message for backend rate limiting", async () => {
    mocks.lookup.mockRejectedValue({ status: 429, code: "RATE_LIMITED", message: "Too Many Requests" });
    renderPage();
    await submitPhone();

    expect((await screen.findByRole("alert")).textContent).toContain("Too many attempts. Please wait a few minutes and try again.");
  });
});
