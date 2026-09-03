const DEFAULT_BUSINESS_WHATSAPP_NUMBER = "553195415323";

export function getBusinessWhatsAppNumber(): string {
  const configured = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";
  return configured || DEFAULT_BUSINESS_WHATSAPP_NUMBER;
}

export function buildBusinessWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${getBusinessWhatsAppNumber()}`;
  return message?.trim() ? `${base}?text=${encodeURIComponent(message.trim())}` : base;
}
