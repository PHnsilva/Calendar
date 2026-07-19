import { describe, expect, it } from "vitest";
import { getAdminAgendaRange, isDateInAdminAgendaRange } from "./admin-agenda-range";

const reference = new Date(2026, 6, 18, 20, 30);

describe("admin agenda ranges", () => {
  it("builds today, seven-day and month ranges in local calendar dates", () => {
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
    expect(getAdminAgendaRange("THIS_MONTH", reference)).toMatchObject({
      from: "2026-07-01",
      to: "2026-07-31",
      optionLabel: "Este mês",
    });
  });

  it("keeps tomorrow inside the default seven-day window and excludes its first day outside", () => {
    const range = getAdminAgendaRange("NEXT_7_DAYS", reference);
    expect(isDateInAdminAgendaRange("2026-07-19", range)).toBe(true);
    expect(isDateInAdminAgendaRange("2026-07-24", range)).toBe(true);
    expect(isDateInAdminAgendaRange("2026-07-25", range)).toBe(false);
  });
});
