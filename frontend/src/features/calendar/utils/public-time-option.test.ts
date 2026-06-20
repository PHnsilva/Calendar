import { describe, expect, it } from "vitest";
import { buildPublicTimeOptionClassName, getPublicTimeOptionToneClass } from "./public-time-option";

describe("public time option helpers", () => {
  const slots = [
    { date: "2026-07-03", startTime: "09:00", endTime: "10:00", available: true, label: "09:00 - 10:00" },
    { date: "2026-07-03", startTime: "10:00", endTime: "11:00", available: true, label: "10:00 - 11:00" },
    { date: "2026-07-03", startTime: "11:00", endTime: "12:00", available: true, label: "11:00 - 12:00" },
  ] as const;

  it("keeps tone styling independent from the selected slot", () => {
    expect(getPublicTimeOptionToneClass(0)).toBe("wf-time-option--tone-green");
    expect(getPublicTimeOptionToneClass(3)).toBe("wf-time-option--tone-blue");
  });

  it("marks only the current selected time as active", () => {
    const firstSelection = slots.map((slot, index) => buildPublicTimeOptionClassName(slot, "10:00", index));
    expect(firstSelection[0]).not.toContain("is-active");
    expect(firstSelection[1]).toContain("is-active");
    expect(firstSelection[2]).not.toContain("is-active");

    const secondSelection = slots.map((slot, index) => buildPublicTimeOptionClassName(slot, "11:00", index));
    expect(secondSelection[0]).not.toContain("is-active");
    expect(secondSelection[1]).not.toContain("is-active");
    expect(secondSelection[2]).toContain("is-active");
  });
});
