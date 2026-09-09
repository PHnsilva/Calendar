import { describe, expect, it } from "vitest";
import { getAdminAgendaRange, isDateInAdminAgendaRange } from "./admin-agenda-range";

const reference = new Date(2026, 6, 18, 20, 30);

describe("admin agenda ranges", () => {
  it("builds today and rolling ranges in local calendar dates", () => {
    expect(getAdminAgendaRange("TODAY", reference)).toMatchObject({
      from: "2026-07-18",
      to: "2026-07-18",
      optionLabel: "Hoje",
    });
    expect(getAdminAgendaRange("NEXT_7_DAYS", reference)).toMatchObject({
      from: "2026-07-18",
      to: "2026-07-24",
      optionLabel: "Próximos 7 dias",
    });
    expect(getAdminAgendaRange("NEXT_30_DAYS", reference)).toMatchObject({
      from: "2026-07-18",
      to: "2026-08-16",
      optionLabel: "Próximos 30 dias",
    });
    expect(getAdminAgendaRange("NEXT_MONTH", reference)).toMatchObject({
      from: "2026-08-01",
      to: "2026-08-31",
      optionLabel: "Próximo mês",
    });
  });

  it("keeps tomorrow inside the default seven-day window and excludes its first day outside", () => {
    const range = getAdminAgendaRange("NEXT_7_DAYS", reference);
    expect(isDateInAdminAgendaRange("2026-07-19", range)).toBe(true);
    expect(isDateInAdminAgendaRange("2026-07-24", range)).toBe(true);
    expect(isDateInAdminAgendaRange("2026-07-25", range)).toBe(false);
  });

  it("rolls the thirty-day and next-month ranges into the next year", () => {
    const decemberReference = new Date(2026, 11, 20, 20, 30);

    expect(getAdminAgendaRange("NEXT_30_DAYS", decemberReference)).toMatchObject({
      from: "2026-12-20",
      to: "2027-01-18",
    });
    expect(getAdminAgendaRange("NEXT_MONTH", decemberReference)).toMatchObject({
      from: "2027-01-01",
      to: "2027-01-31",
    });
  });
});
