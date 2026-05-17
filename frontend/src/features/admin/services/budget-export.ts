import type { ServicoResponse } from "../../../types/api";

export type BudgetItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type BudgetProvider = {
  name: string;
  phone: string;
  email: string;
  city: string;
};

export type BudgetExportInput = {
  provider: BudgetProvider;
  service: ServicoResponse;
  items: BudgetItem[];
  issuedAt: Date;
  validUntil?: Date;
  notes?: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatBudgetCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function budgetTotal(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.quantity || 0) * Math.max(0, item.unitPrice || 0), 0);
}

export function serviceClientName(service: ServicoResponse): string {
  return `${service.clientFirstName ?? ""} ${service.clientLastName ?? ""}`.trim() || "Cliente";
}

export function formatServiceDate(value: string): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateOnly(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function serviceAddress(service: ServicoResponse): string {
  return [
    service.clientAddressLine,
    service.clientStreet,
    service.clientNeighborhood,
    service.clientCity,
    service.clientState,
  ].filter(Boolean).join(" | ");
}

function buildBudgetHtml(input: BudgetExportInput): string {
  const total = budgetTotal(input.items);
  const subtotal = total;
  const validUntil = input.validUntil ? formatDateOnly(input.validUntil) : "";
  const rows = input.items.map((item) => {
    const quantity = Math.max(0, item.quantity || 0);
    const itemTotal = quantity * Math.max(0, item.unitPrice || 0);
    return `
      <tr>
        <td>${escapeHtml(item.description || "Item")}</td>
        <td>${quantity}</td>
        <td>${formatBudgetCurrency(item.unitPrice)}</td>
        <td>${formatBudgetCurrency(itemTotal)}</td>
      </tr>
    `;
  }).join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orcamento - ${escapeHtml(serviceClientName(input.service))}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 32px; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    h2 { margin: 24px 0 10px; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; }
    p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 9px 10px; text-align: left; }
    th { background: #f3f4f6; }
    .meta { text-align: right; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .totals { margin-left: auto; width: 320px; }
    .totals td:last-child { text-align: right; font-weight: 700; }
    .notes { margin-top: 24px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; }
    @media print { body { margin: 18mm; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Orcamento</h1>
      <p><strong>${escapeHtml(input.provider.name)}</strong></p>
      <p>${escapeHtml(input.provider.phone)} | ${escapeHtml(input.provider.email)}</p>
      <p>${escapeHtml(input.provider.city)}</p>
    </div>
    <div class="meta">
      <p><strong>Emissao:</strong> ${formatDateOnly(input.issuedAt)}</p>
      ${validUntil ? `<p><strong>Validade:</strong> ${validUntil}</p>` : ""}
    </div>
  </header>

  <section class="grid">
    <div>
      <h2>Dados do cliente</h2>
      <p><strong>Nome:</strong> ${escapeHtml(serviceClientName(input.service))}</p>
      ${input.service.clientPhone ? `<p><strong>Telefone:</strong> ${escapeHtml(input.service.clientPhone)}</p>` : ""}
      ${input.service.clientEmail ? `<p><strong>E-mail:</strong> ${escapeHtml(input.service.clientEmail)}</p>` : ""}
      ${serviceAddress(input.service) ? `<p><strong>Endereco/regiao:</strong> ${escapeHtml(serviceAddress(input.service))}</p>` : ""}
    </div>
    <div>
      <h2>Dados do servico</h2>
      <p><strong>Tipo:</strong> ${escapeHtml(input.service.serviceType || "Servico")}</p>
      <p><strong>Data:</strong> ${escapeHtml(formatServiceDate(input.service.start))}</p>
      ${input.service.status ? `<p><strong>Status:</strong> ${escapeHtml(input.service.status)}</p>` : ""}
      ${input.service.clientAddressLine ? `<p><strong>Observacoes:</strong> ${escapeHtml(input.service.clientAddressLine)}</p>` : ""}
    </div>
  </section>

  <h2>Itens</h2>
  <table>
    <thead>
      <tr><th>Descricao</th><th>Qtd.</th><th>Valor unitario</th><th>Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    <tbody>
      <tr><td>Subtotal</td><td>${formatBudgetCurrency(subtotal)}</td></tr>
      <tr><td>Total geral</td><td>${formatBudgetCurrency(total)}</td></tr>
    </tbody>
  </table>

  <div class="notes">
    <strong>Observacoes finais</strong>
    <p>${escapeHtml(input.notes || "Valores sujeitos a alteracao apos vistoria tecnica, quando aplicavel.")}</p>
  </div>
</body>
</html>`;
}

export function exportBudgetPdf(input: BudgetExportInput): boolean {
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) return false;
  popup.opener = null;
  popup.document.open();
  popup.document.write(buildBudgetHtml(input));
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 250);
  return true;
}

export function exportBudgetXls(input: BudgetExportInput): void {
  const html = buildBudgetHtml(input);
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orcamento-${serviceClientName(input.service).replace(/\s+/g, "-").toLowerCase()}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
