export type AdminStatementEntry = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
  amount: number;
  city?: string;
};

export type OfxParseResult = {
  entries: AdminStatementEntry[];
  fileName: string;
  creditTotal: number;
  debitTotal: number;
};

export type FinancialChartPoint = {
  day: string;
  entries: number;
  exits: number;
  balance: number;
};

export type FinancialTransaction = {
  date: string;
  description: string;
  type: "ENTRY" | "EXIT";
  category?: string;
  appointmentCode?: string;
  amount: number;
};

export type FinancialDashboardDTO = {
  month: string;
  totalEntries: number;
  totalExits: number;
  availableBalance: number;
  totalAppointments: number;
  chart: FinancialChartPoint[];
  transactions: FinancialTransaction[];
};

export type PixPayloadConfig = {
  key: string;
  recipientName: string;
  recipientCity: string;
  description?: string;
};
