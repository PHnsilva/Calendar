import { describe, expect, it } from "vitest";
import { bookingKeys } from "./booking.keys";

describe("bookingKeys", () => {
  it("normalizes token sets so equivalent booking lists share a key", () => {
    expect(bookingKeys.mine([" token-b ", "token-a", "token-b", ""])).toEqual([
      "bookings",
      "list",
      "mine",
      ["token-a", "token-b"],
    ]);
  });

  it("normalizes admin filters to a stable shape", () => {
    expect(bookingKeys.admin({ from: " 2026-06-01 ", city: " Itabirito ", status: "" })).toEqual([
      "bookings",
      "list",
      "admin",
      { from: "2026-06-01", to: null, status: null, city: "Itabirito" },
    ]);
  });
});
