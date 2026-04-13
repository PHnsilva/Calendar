export interface AdminStatementItem {
  id: string;
  date: string;
  description: string;
  amount: string;
  amountCents: number;
}

export interface AdminStatementResponse {
  items: AdminStatementItem[];
}

export interface AdminFinanceHealthResponse {
  ok: boolean;
  provider: string;
  message: string;
}

export interface AdminHistoryItem {
  id: string;
  occurredAt: string;
  title: string;
  description: string;
  actor: string;
  type: "agendamento" | "financeiro" | "sistema";
  bookingId?: string;
  tone?: "purple" | "cyan" | "violet" | "pink" | "orange";
}

export interface AdminBookingItem {
  id: string;
  clientName: string;
  serviceType: string;
  city: string;
  address: string;
  startAt: string;
  status: "confirmado" | "pendente" | "concluido";
  amountCents: number;
  tone: "royal" | "orange" | "violet" | "teal" | "cyan";
  icon: string;
}
