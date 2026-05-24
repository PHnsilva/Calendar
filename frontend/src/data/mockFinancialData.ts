export type FinancialChartPoint = {
  day: string;
  entries: number;
  exits: number;
  balance: number;
};

export type FinancialTransaction = {
  id: string;
  date: string;
  description: string;
  type: 'ENTRY' | 'EXIT';
  category: string;
  appointmentCode?: string;
  amount: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELED';
};

export type FinancialMockData = {
  month: string;
  totalEntries: number;
  totalExits: number;
  availableBalance: number;
  totalAppointments: number;
  pixCommissionRate: number;
  pixCommissionAmount: number;
  chart: FinancialChartPoint[];
  transactions: FinancialTransaction[];
};

export type FinancialPeriodStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELED';

export type FinancialHistoryPeriod = FinancialMockData & {
  id: string;
  pixStatus: FinancialPeriodStatus;
  pixPaidAt?: string;
  notes: string;
};

const COMMISSION_RATE = 0.12;

function withTotals(month: string, totalAppointments: number, chart: FinancialChartPoint[], transactions: FinancialTransaction[]): FinancialMockData {
  const totalEntries = transactions
    .filter((transaction) => transaction.type === 'ENTRY')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExits = transactions
    .filter((transaction) => transaction.type === 'EXIT')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const availableBalance = totalEntries - totalExits;

  return {
    month,
    totalEntries,
    totalExits,
    availableBalance,
    totalAppointments,
    pixCommissionRate: COMMISSION_RATE,
    pixCommissionAmount: calculatePixCommission(totalEntries),
    chart,
    transactions,
  };
}

export function calculatePixCommission(statementBase: number): number {
  return Number((statementBase * COMMISSION_RATE).toFixed(2));
}

export function generateFakePixCode(data: FinancialMockData): string {
  const monthDigits = data.month.replace(/\D/g, '');
  const value = data.pixCommissionAmount.toFixed(2).replace('.', '');
  return `00020126580014BR.GOV.BCB.PIX0136MOCK-SG-PIX-${monthDigits}520400005303986540${value}5802BR5920SG PEQUENOS REPAROS6009ITABIRITO62140510COMISSAO6304FAKE`;
}

export const mockFinancialData = withTotals(
  '2026-05',
  28,
  [
    { day: '01/05', entries: 680, exits: 80, balance: 600 },
    { day: '04/05', entries: 1160, exits: 130, balance: 1630 },
    { day: '07/05', entries: 920, exits: 220, balance: 2330 },
    { day: '10/05', entries: 1480, exits: 180, balance: 3630 },
    { day: '13/05', entries: 760, exits: 95, balance: 4295 },
    { day: '16/05', entries: 1340, exits: 310, balance: 5325 },
    { day: '19/05', entries: 1010, exits: 170, balance: 6165 },
    { day: '22/05', entries: 1620, exits: 260, balance: 7525 },
    { day: '25/05', entries: 790, exits: 115, balance: 8200 },
    { day: '28/05', entries: 1520, exits: 205, balance: 9515 },
  ],
  [
    { id: 'txn-2026-05-001', date: '2026-05-01', description: 'Pagamento recebido - troca de fechadura', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0526-001', amount: 680, status: 'CONFIRMED' },
    { id: 'txn-2026-05-002', date: '2026-05-04', description: 'Pagamento recebido - reparo hidraulico', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0526-004', amount: 1160, status: 'CONFIRMED' },
    { id: 'txn-2026-05-003', date: '2026-05-04', description: 'Compra de material eletrico', type: 'EXIT', category: 'Material', amount: 130, status: 'CONFIRMED' },
    { id: 'txn-2026-05-004', date: '2026-05-07', description: 'Pagamento recebido - instalacao de suporte', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0526-009', amount: 920, status: 'CONFIRMED' },
    { id: 'txn-2026-05-005', date: '2026-05-10', description: 'Pagamento recebido - manutencao predial', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0526-014', amount: 1480, status: 'CONFIRMED' },
    { id: 'txn-2026-05-006', date: '2026-05-13', description: 'Taxa de deslocamento / combustivel', type: 'EXIT', category: 'Operacional', amount: 95, status: 'CONFIRMED' },
    { id: 'txn-2026-05-007', date: '2026-05-16', description: 'Pagamento recebido - pequenos reparos', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0526-019', amount: 1340, status: 'CONFIRMED' },
    { id: 'txn-2026-05-008', date: '2026-05-22', description: 'Pagamento recebido - atendimento residencial', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0526-024', amount: 1620, status: 'PENDING' },
  ],
);

export const mockProcessedFinancialData = withTotals(
  '2026-05',
  32,
  [
    { day: '01/05', entries: 820, exits: 90, balance: 730 },
    { day: '04/05', entries: 1340, exits: 130, balance: 1940 },
    { day: '07/05', entries: 1260, exits: 260, balance: 2940 },
    { day: '10/05', entries: 1640, exits: 180, balance: 4400 },
    { day: '13/05', entries: 980, exits: 95, balance: 5285 },
    { day: '16/05', entries: 1520, exits: 310, balance: 6495 },
    { day: '19/05', entries: 1190, exits: 170, balance: 7515 },
    { day: '22/05', entries: 1850, exits: 260, balance: 9105 },
    { day: '25/05', entries: 920, exits: 115, balance: 9910 },
    { day: '28/05', entries: 1690, exits: 205, balance: 11395 },
  ],
  [
    { id: 'txn-ofx-001', date: '2026-05-01', description: 'OFX - pagamento Pix SG-0526-001', type: 'ENTRY', category: 'Pix', appointmentCode: 'SG-0526-001', amount: 820, status: 'CONFIRMED' },
    { id: 'txn-ofx-002', date: '2026-05-04', description: 'OFX - pagamento Pix SG-0526-004', type: 'ENTRY', category: 'Pix', appointmentCode: 'SG-0526-004', amount: 1340, status: 'CONFIRMED' },
    { id: 'txn-ofx-003', date: '2026-05-07', description: 'OFX - pagamento cartao SG-0526-009', type: 'ENTRY', category: 'Cartao', appointmentCode: 'SG-0526-009', amount: 1260, status: 'CONFIRMED' },
    { id: 'txn-ofx-004', date: '2026-05-07', description: 'OFX - material para atendimento', type: 'EXIT', category: 'Material', amount: 260, status: 'CONFIRMED' },
    { id: 'txn-ofx-005', date: '2026-05-10', description: 'OFX - pagamento Pix SG-0526-014', type: 'ENTRY', category: 'Pix', appointmentCode: 'SG-0526-014', amount: 1640, status: 'CONFIRMED' },
    { id: 'txn-ofx-006', date: '2026-05-16', description: 'OFX - pagamento Pix SG-0526-019', type: 'ENTRY', category: 'Pix', appointmentCode: 'SG-0526-019', amount: 1520, status: 'CONFIRMED' },
    { id: 'txn-ofx-007', date: '2026-05-22', description: 'OFX - pagamento Pix SG-0526-024', type: 'ENTRY', category: 'Pix', appointmentCode: 'SG-0526-024', amount: 1850, status: 'CONFIRMED' },
    { id: 'txn-ofx-008', date: '2026-05-28', description: 'OFX - pagamento Pix SG-0526-030', type: 'ENTRY', category: 'Pix', appointmentCode: 'SG-0526-030', amount: 1690, status: 'PENDING' },
  ],
);

export const mockFinancialHistoryPeriods: FinancialHistoryPeriod[] = [
  {
    id: 'period-2026-04',
    pixStatus: 'PAID',
    pixPaidAt: '2026-05-03',
    notes: 'Comissao liquidada no fechamento mensal.',
    ...withTotals('2026-04', 31, [
      { day: '03/04', entries: 950, exits: 120, balance: 830 },
      { day: '08/04', entries: 1440, exits: 220, balance: 2050 },
      { day: '12/04', entries: 1160, exits: 150, balance: 3060 },
      { day: '18/04', entries: 1820, exits: 290, balance: 4590 },
      { day: '24/04', entries: 1590, exits: 170, balance: 6010 },
    ], [
      { id: 'txn-2026-04-001', date: '2026-04-03', description: 'Pagamento Pix - reparo eletrico', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0426-003', amount: 950, status: 'CONFIRMED' },
      { id: 'txn-2026-04-002', date: '2026-04-08', description: 'Pagamento Pix - manutencao geral', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0426-008', amount: 1440, status: 'CONFIRMED' },
      { id: 'txn-2026-04-003', date: '2026-04-12', description: 'Materiais e insumos', type: 'EXIT', category: 'Material', amount: 150, status: 'CONFIRMED' },
      { id: 'txn-2026-04-004', date: '2026-04-18', description: 'Pagamento cartao - atendimento comercial', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0426-018', amount: 1820, status: 'CONFIRMED' },
    ]),
  },
  {
    id: 'period-2026-03',
    pixStatus: 'PENDING',
    notes: 'Aguardando conferencia do fechamento.',
    ...withTotals('2026-03', 26, [
      { day: '04/03', entries: 740, exits: 90, balance: 650 },
      { day: '09/03', entries: 1280, exits: 180, balance: 1750 },
      { day: '15/03', entries: 980, exits: 210, balance: 2520 },
      { day: '21/03', entries: 1360, exits: 140, balance: 3740 },
      { day: '27/03', entries: 1210, exits: 160, balance: 4790 },
    ], [
      { id: 'txn-2026-03-001', date: '2026-03-04', description: 'Pagamento Pix - atendimento residencial', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0326-005', amount: 740, status: 'CONFIRMED' },
      { id: 'txn-2026-03-002', date: '2026-03-09', description: 'Pagamento Pix - instalacao', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0326-011', amount: 1280, status: 'CONFIRMED' },
      { id: 'txn-2026-03-003', date: '2026-03-15', description: 'Compra de material', type: 'EXIT', category: 'Material', amount: 210, status: 'CONFIRMED' },
      { id: 'txn-2026-03-004', date: '2026-03-27', description: 'Pagamento Pix - reparo urgente', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0326-024', amount: 1210, status: 'PENDING' },
    ]),
  },
  {
    id: 'period-2026-02',
    pixStatus: 'OVERDUE',
    notes: 'Pix de comissao vencido, revisar pendencia.',
    ...withTotals('2026-02', 22, [
      { day: '02/02', entries: 640, exits: 80, balance: 560 },
      { day: '07/02', entries: 1140, exits: 170, balance: 1530 },
      { day: '14/02', entries: 860, exits: 140, balance: 2250 },
      { day: '21/02', entries: 1200, exits: 220, balance: 3230 },
      { day: '27/02', entries: 980, exits: 120, balance: 4090 },
    ], [
      { id: 'txn-2026-02-001', date: '2026-02-02', description: 'Pagamento Pix - pequenos reparos', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0226-002', amount: 640, status: 'CONFIRMED' },
      { id: 'txn-2026-02-002', date: '2026-02-07', description: 'Pagamento Pix - manutencao', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0226-007', amount: 1140, status: 'CONFIRMED' },
      { id: 'txn-2026-02-003', date: '2026-02-21', description: 'Ferramentas e insumos', type: 'EXIT', category: 'Operacional', amount: 220, status: 'CONFIRMED' },
      { id: 'txn-2026-02-004', date: '2026-02-27', description: 'Pagamento cartao - atendimento', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0226-020', amount: 980, status: 'CONFIRMED' },
    ]),
  },
  {
    id: 'period-2026-01',
    pixStatus: 'CANCELED',
    notes: 'Fechamento ignorado por ajuste manual.',
    ...withTotals('2026-01', 18, [
      { day: '05/01', entries: 560, exits: 70, balance: 490 },
      { day: '11/01', entries: 900, exits: 110, balance: 1280 },
      { day: '17/01', entries: 780, exits: 100, balance: 1960 },
      { day: '23/01', entries: 1120, exits: 130, balance: 2950 },
      { day: '29/01', entries: 760, exits: 90, balance: 3620 },
    ], [
      { id: 'txn-2026-01-001', date: '2026-01-05', description: 'Pagamento Pix - atendimento', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0126-003', amount: 560, status: 'CONFIRMED' },
      { id: 'txn-2026-01-002', date: '2026-01-11', description: 'Pagamento Pix - reparo', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0126-009', amount: 900, status: 'CONFIRMED' },
      { id: 'txn-2026-01-003', date: '2026-01-23', description: 'Compra material', type: 'EXIT', category: 'Material', amount: 130, status: 'CANCELED' },
      { id: 'txn-2026-01-004', date: '2026-01-29', description: 'Pagamento Pix - manutencao', type: 'ENTRY', category: 'Atendimento', appointmentCode: 'SG-0126-017', amount: 760, status: 'CONFIRMED' },
    ]),
  },
];
