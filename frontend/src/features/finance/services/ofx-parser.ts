import type { AdminStatementEntry, OfxParseResult } from "../types";

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
