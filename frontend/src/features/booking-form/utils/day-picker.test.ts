import { describe, expect, it } from "vitest";
import { getBookingDayButtonClassName } from "./day-picker";

describe("booking day picker classes", () => {
  it("marks only the current calendar date as selected", () => {
    const firstDay = getBookingDayButtonClassName({
      cellDate: "2026-06-08",
      isCurrentMonth: true,
      isDisabled: false,
      calendarDate: "2026-06-12",
      confirmedDate: "2026-06-08",
    });
    const secondDay = getBookingDayButtonClassName({
      cellDate: "2026-06-12",
      isCurrentMonth: true,
      isDisabled: false,
      calendarDate: "2026-06-12",
      confirmedDate: "2026-06-08",
    });

    expect(firstDay).not.toContain("booking-day-picker__day--selected");
    expect(firstDay).not.toContain("booking-day-picker__day--confirmed");
    expect(secondDay).toContain("booking-day-picker__day--selected");
  });
});
