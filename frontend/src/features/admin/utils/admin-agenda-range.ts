export type AdminAgendaRangeKey = "TODAY" | "NEXT_7_DAYS" | "NEXT_30_DAYS" | "NEXT_MONTH";

export type AdminAgendaRange = {
  from: string;
  to: string;
  label: string;
  optionLabel: string;
  summaryLabel: string;
  viewDescription: string;
};

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const shortDateWithYear = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
}

function formatRangeLabel(from: Date, to: Date): string {
  if (toIsoDate(from) === toIsoDate(to)) {
    return shortDateWithYear.format(from).replaceAll(".", "");
  }
  return `${shortDate.format(from).replaceAll(".", "")} – ${shortDateWithYear.format(to).replaceAll(".", "")}`;
}

export function getAdminAgendaRange(key: AdminAgendaRangeKey, reference = new Date()): AdminAgendaRange {
  const today = startOfLocalDay(reference);

  if (key === "TODAY") {
    return {
      from: toIsoDate(today),
      to: toIsoDate(today),
      label: formatRangeLabel(today, today),
      optionLabel: "Hoje",
      summaryLabel: "hoje",
      viewDescription: "Visão dos agendamentos de hoje",
    };
  }

  if (key === "NEXT_30_DAYS") {
    const to = new Date(today);
    to.setDate(today.getDate() + 29);
    return {
      from: toIsoDate(today),
      to: toIsoDate(to),
      label: formatRangeLabel(today, to),
      optionLabel: "Próximos 30 dias",
      summaryLabel: "próximos 30 dias",
      viewDescription: "Visão dos próximos 30 dias",
    };
  }

  if (key === "NEXT_MONTH") {
    const from = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return {
      from: toIsoDate(from),
      to: toIsoDate(to),
      label: formatRangeLabel(from, to),
      optionLabel: "Próximo mês",
      summaryLabel: "próximo mês",
      viewDescription: "Visão dos agendamentos do próximo mês",
    };
  }

  const to = new Date(today);
  to.setDate(today.getDate() + 6);
  return {
    from: toIsoDate(today),
    to: toIsoDate(to),
    label: formatRangeLabel(today, to),
    optionLabel: "Próximos 7 dias",
    summaryLabel: "próximos 7 dias",
    viewDescription: "Visão dos próximos 7 dias",
  };
}

export function isDateInAdminAgendaRange(date: string, range: Pick<AdminAgendaRange, "from" | "to">): boolean {
  const normalized = date.slice(0, 10);
  return normalized >= range.from && normalized <= range.to;
}
