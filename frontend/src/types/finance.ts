export type AdminStatementItem = {
  id: string;
  date: string;
  description: string;
  amount: string;
  amountCents: number;
};

export type AdminStatementResponse = {
  items: AdminStatementItem[];
};

export type AdminHealthResponse = {
  ok: boolean;
  provider: string;
  message: string;
};
