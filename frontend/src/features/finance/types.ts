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

export type PixPayloadConfig = {
  key: string;
  recipientName: string;
  recipientCity: string;
  description?: string;
};
