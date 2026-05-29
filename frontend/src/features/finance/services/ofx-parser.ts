import type { AdminStatementEntry, FinancialDashboardDTO, FinancialTransaction, OfxParseResult } from "../types";

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseFinanceAmount(raw?: string | number | null): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const value = String(raw ?? "").trim();
  if (!value) return 0;

  const negative = value.startsWith("-") || (value.includes("(") && value.includes(")"));
  let cleaned = value
    .replace(/R\$/gi, "")
    .replace(/[()\s]/g, "")
    .replace(/[^0-9,.-]/g, "");

  if (cleaned.startsWith("-")) cleaned = cleaned.slice(1);
  cleaned = cleaned.replace(/-/g, "");

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimal = lastComma > lastDot ? "," : lastDot >= 0 ? "." : "";
  const normalized = decimal === ","
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : decimal === "."
      ? cleaned.replace(/,/g, "")
      : cleaned;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function readOfxTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function parseOfxDate(raw: string): string {
  const value = raw.trim();
  if (/^\d{8}/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return toIsoDate(new Date());
}

export function parseOfxFile(text: string, fileName: string): OfxParseResult {
  const blocks = Array.from(text.matchAll(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi));
  const entries: AdminStatementEntry[] = blocks.map((match, index) => {
    const block = match[1] ?? "";
    const amount = parseFinanceAmount(readOfxTag(block, "TRNAMT"));
    const date = parseOfxDate(readOfxTag(block, "DTPOSTED"));
    const memo = readOfxTag(block, "MEMO") || readOfxTag(block, "NAME") || "Lancamento OFX";
    const id = readOfxTag(block, "FITID") || `${fileName}-${index}`;
    const type = readOfxTag(block, "TRNTYPE") || (amount >= 0 ? "CREDIT" : "DEBIT");

    return {
      id,
      title: memo,
      date,
      time: "",
      category: type.toLowerCase(),
      amount,
    };
  }).filter((entry) => entry.date && Number.isFinite(entry.amount));

  return {
    entries,
    fileName,
    creditTotal: entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0),
    debitTotal: Math.abs(entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0)),
  };
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getAppointmentCode(text: string): string | undefined {
  const match = text.match(/\b(?:AGD|SG)-[0-9A-Z-]+\b/i);
  return match?.[0]?.toUpperCase();
}

function normalizeCategory(entry: AdminStatementEntry): string {
  const value = entry.category.toLowerCase();
  if (value.includes("fee") || value.includes("tax") || value.includes("taxa")) return "Taxas e tarifas";
  if (value.includes("debit") || value.includes("pagamento") || value.includes("material")) return entry.amount < 0 ? "Materiais" : "Serviços de reparo";
  if (entry.amount > 0) return "Serviços de reparo";
  return "Despesas";
}

export function buildFinancialDashboardFromEntries(entries: AdminStatementEntry[]): FinancialDashboardDTO {
  const normalizedEntries = [...entries].filter((entry) => entry.date && Number.isFinite(entry.amount));
  const firstDate = normalizedEntries[0]?.date ? new Date(`${normalizedEntries[0].date}T12:00:00`) : new Date();
  const year = firstDate.getFullYear();
  const monthIndex = firstDate.getMonth();
  const month = `${year}-${`${monthIndex + 1}`.padStart(2, "0")}`;
  const days = getDaysInMonth(year, monthIndex);

  const transactions: FinancialTransaction[] = normalizedEntries
    .map((entry) => {
      const amount = Math.abs(entry.amount);
      const type: FinancialTransaction["type"] = entry.amount >= 0 ? "ENTRY" : "EXIT";
      return {
        date: entry.date,
        description: entry.title,
        type,
        category: normalizeCategory(entry),
        appointmentCode: getAppointmentCode(entry.title),
        amount,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const byDay = new Map<string, { entries: number; exits: number }>();
  transactions.forEach((transaction) => {
    const date = new Date(`${transaction.date}T12:00:00`);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex) return;
    const key = `${date.getDate()}`.padStart(2, "0");
    const current = byDay.get(key) ?? { entries: 0, exits: 0 };
    if (transaction.type === "ENTRY") current.entries += transaction.amount;
    else current.exits += transaction.amount;
    byDay.set(key, current);
  });

  let balance = 0;
  const chart = Array.from({ length: days }, (_, index) => {
    const dayNumber = `${index + 1}`.padStart(2, "0");
    const totals = byDay.get(dayNumber) ?? { entries: 0, exits: 0 };
    balance += totals.entries - totals.exits;
    return {
      day: `${dayNumber}/${`${monthIndex + 1}`.padStart(2, "0")}`,
      entries: totals.entries,
      exits: totals.exits,
      balance,
    };
  });

  const appointmentCodes = new Set(transactions.map((transaction) => transaction.appointmentCode).filter(Boolean));
  const totalEntries = transactions.filter((transaction) => transaction.type === "ENTRY").reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExits = transactions.filter((transaction) => transaction.type === "EXIT").reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    month,
    totalEntries,
    totalExits,
    availableBalance: totalEntries - totalExits,
    totalAppointments: appointmentCodes.size,
    chart,
    transactions,
  };
}

export function parseOfxToFinancialDashboard(text: string, fileName: string): FinancialDashboardDTO {
  return buildFinancialDashboardFromEntries(parseOfxFile(text, fileName).entries);
}
