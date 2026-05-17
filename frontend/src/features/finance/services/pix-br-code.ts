import type { PixPayloadConfig } from "../types";

function sanitizePixText(value: string, fallback: string, maxLength: number): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-.\/:]/g, "")
    .trim()
    .toUpperCase();
  return (normalized || fallback).slice(0, maxLength);
}

function emv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(config: PixPayloadConfig, amount: number): string {
  const key = config.key.trim();
  if (!key || amount <= 0) return "";

  const description = sanitizePixText(config.description ?? "Comissao socio", "COMISSAO SOCIO", 25);
  const merchantAccount = emv("00", "br.gov.bcb.pix") + emv("01", key) + emv("02", description);
  const payloadWithoutCrc = [
    emv("00", "01"),
    emv("26", merchantAccount),
    emv("52", "0000"),
    emv("53", "986"),
    emv("54", amount.toFixed(2)),
    emv("58", "BR"),
    emv("59", sanitizePixText(config.recipientName, "SG PEQUENOS REPAROS", 25)),
    emv("60", sanitizePixText(config.recipientCity, "BELO HORIZONTE", 15)),
    emv("62", emv("05", "***")),
  ].join("");
  const crcInput = `${payloadWithoutCrc}6304`;
  return `${crcInput}${crc16(crcInput)}`;
}
