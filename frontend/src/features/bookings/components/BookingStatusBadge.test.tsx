// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mapBookingStatus } from "../../../entities/booking";
import { BookingStatusBadge } from "./BookingStatusBadge";

afterEach(cleanup);

describe("BookingStatusBadge", () => {
  it("renders the mapped pending label with the existing CSS modifier", () => {
    render(<BookingStatusBadge status={mapBookingStatus("PENDING_PHONE")} />);

    const badge = screen.getByText("Pendente");
    expect(badge.classList.contains("booking-status-badge")).toBe(true);
    expect(badge.classList.contains("booking-status-badge--pending_phone")).toBe(true);
  });

  it("preserves the existing fallback for an unknown status", () => {
    render(<BookingStatusBadge status={mapBookingStatus("RESCHEDULED")} />);

    const badge = screen.getByText("RESCHEDULED");
    expect(badge.classList.contains("booking-status-badge--rescheduled")).toBe(true);
  });
});
