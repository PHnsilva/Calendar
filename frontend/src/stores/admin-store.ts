import { useMemo, useState } from "react"
import { getFinanceHealth } from "../features/finance/api/get-finance-health"
import { getStatement } from "../features/finance/api/get-statement"
import type {
  AdminBookingItem,
  AdminFinanceHealthResponse,
  AdminHistoryItem,
  AdminStatementItem
} from "../types/finance"

const adminBookings: AdminBookingItem[] = [
  {
    id: "bk-001",
    clientName: "Mariana Souza",
    serviceType: "Instalação elétrica",
    city: "Centro",
    address: "Rua do Comércio, 154",
    startAt: "2026-04-05T09:30:00-03:00",
    status: "confirmado",
    amountCents: 15500,
    tone: "royal",
    icon: "⚡"
  },
  {
    id: "bk-002",
    clientName: "Carlos Henrique",
    serviceType: "Limpeza de caixa d'água",
    city: "São Benedito",
    address: "Av. Brasília, 88",
    startAt: "2026-04-05T11:10:00-03:00",
    status: "concluido",
    amountCents: 11572,
    tone: "cyan",
    icon: "🧰"
  },
  {
    id: "bk-003",
    clientName: "Fernanda Lima",
    serviceType: "Troca de chuveiro",
    city: "Venda Nova",
    address: "Rua das Palmeiras, 19",
    startAt: "2026-04-05T15:00:00-03:00",
    status: "pendente",
    amountCents: 18990,
    tone: "violet",
    icon: "🚿"
  },
  {
    id: "bk-004",
    clientName: "João Pedro",
    serviceType: "Ajuste hidráulico",
    city: "Pampulha",
    address: "Av. Fleming, 404",
    startAt: "2026-04-05T17:00:00-03:00",
    status: "confirmado",
    amountCents: 26990,
    tone: "orange",
    icon: "🔧"
  },
  {
    id: "bk-005",
    clientName: "Luciana Costa",
    serviceType: "Pintura de acabamento",
    city: "Barreiro",
    address: "Rua do Ouro, 731",
    startAt: "2026-04-04T08:30:00-03:00",
    status: "confirmado",
    amountCents: 17885,
    tone: "teal",
    icon: "🎨"
  },
  {
    id: "bk-006",
    clientName: "Rafael Moreira",
    serviceType: "Montagem de armário",
    city: "Contagem",
    address: "Rua Tiradentes, 62",
    startAt: "2026-04-03T14:40:00-03:00",
    status: "concluido",
    amountCents: 21200,
    tone: "royal",
    icon: "🪚"
  }
]

const adminHistory: AdminHistoryItem[] = [
  {
    id: "hist-001",
    occurredAt: "2026-04-09T08:15:00-03:00",
    title: "VISITA CONFIRMADA",
    description: "Mariana Souza · instalação elétrica",
    actor: "AGENDA",
    type: "agendamento",
    bookingId: "bk-001",
    tone: "purple"
  },
  {
    id: "hist-002",
    occurredAt: "2026-04-11T15:22:00-03:00",
    title: "ETAPA PAGA",
    description: "Carlos Henrique · limpeza técnica",
    actor: "FINANCEIRO",
    type: "financeiro",
    bookingId: "bk-002",
    tone: "cyan"
  },
  {
    id: "hist-003",
    occurredAt: "2026-04-15T10:05:00-03:00",
    title: "EVENTO TARDE",
    description: "Fernanda Lima · troca de chuveiro",
    actor: "AGENDA",
    type: "agendamento",
    bookingId: "bk-003",
    tone: "violet"
  },
  {
    id: "hist-004",
    occurredAt: "2026-04-17T18:00:00-03:00",
    title: "VISITA NOVA",
    description: "João Pedro · ajuste hidráulico",
    actor: "SISTEMA",
    type: "sistema",
    bookingId: "bk-004",
    tone: "pink"
  },
  {
    id: "hist-005",
    occurredAt: "2026-04-25T09:40:00-03:00",
    title: "EVENTO FIXE",
    description: "Luciana Costa · pintura",
    actor: "AGENDA",
    type: "agendamento",
    bookingId: "bk-005",
    tone: "orange"
  }
]

export const useAdminStore = () => {
  const [isStatementOpen, setIsStatementOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [statementItems, setStatementItems] = useState<AdminStatementItem[]>([])
  const [historyItems] = useState<AdminHistoryItem[]>(adminHistory)
  const [financeHealth, setFinanceHealth] = useState<AdminFinanceHealthResponse>({
    ok: true,
    provider: "mock-admin-finance",
    message: "Carregando..."
  })

  const bookings = useMemo(() => adminBookings, [])

  const openStatement = async () => {
    setStatementItems(await getStatement())
    setFinanceHealth(await getFinanceHealth())
    setIsStatementOpen(true)
  }

  const openHistory = () => setIsHistoryOpen(true)
  const closeStatement = () => setIsStatementOpen(false)
  const closeHistory = () => setIsHistoryOpen(false)

  return {
    bookings,
    historyItems,
    statementItems,
    financeHealth,
    isStatementOpen,
    isHistoryOpen,
    openStatement,
    openHistory,
    closeStatement,
    closeHistory
  }
}
