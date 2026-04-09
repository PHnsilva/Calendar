import type { AdminStatementItem } from "../../../types/finance"

const statementItems: AdminStatementItem[] = [
  {
    id: "stmt-001",
    date: "2026-04-05T09:30:00-03:00",
    title: "Atendimento Centro Sul",
    subtitle: "Rua do Comércio, 154 · Belo Horizonte",
    description: "Comissão de visita elétrica",
    amountCents: 738,
    grossAmountCents: 15500,
    rateLabel: "3% de",
    kind: "credit",
    bookingId: "bk-001",
    icon: "🔧"
  },
  {
    id: "stmt-002",
    date: "2026-04-05T11:10:00-03:00",
    title: "Cliente São Benedito",
    subtitle: "Av. Brasília, 88 · Santa Luzia",
    description: "Comissão de limpeza técnica",
    amountCents: 347,
    grossAmountCents: 11572,
    rateLabel: "2,5% de",
    kind: "credit",
    bookingId: "bk-002",
    icon: "🧰"
  },
  {
    id: "stmt-003",
    date: "2026-04-05T16:10:00-03:00",
    title: "Atendimento Pampulha",
    subtitle: "Av. Fleming, 404 · Belo Horizonte",
    description: "Comissão de ajuste hidráulico",
    amountCents: 809,
    grossAmountCents: 26990,
    rateLabel: "3% de",
    kind: "credit",
    bookingId: "bk-004",
    icon: "🚿"
  },
  {
    id: "stmt-004",
    date: "2026-04-04T14:20:00-03:00",
    title: "Cliente Barreiro",
    subtitle: "Rua do Ouro, 731 · Belo Horizonte",
    description: "Comissão de pintura",
    amountCents: 1430,
    grossAmountCents: 17885,
    rateLabel: "8% de",
    kind: "credit",
    bookingId: "bk-005",
    icon: "🎨"
  },
  {
    id: "stmt-005",
    date: "2026-04-03T08:05:00-03:00",
    title: "Montagem Contagem",
    subtitle: "Rua Tiradentes, 62 · Contagem",
    description: "Comissão de montagem",
    amountCents: 1060,
    grossAmountCents: 21200,
    rateLabel: "5% de",
    kind: "credit",
    bookingId: "bk-006",
    icon: "🪚"
  }
]

export const getStatement = async (): Promise<AdminStatementItem[]> => [...statementItems]
