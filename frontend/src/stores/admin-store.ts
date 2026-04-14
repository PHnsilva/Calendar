import { useState } from 'react';
import { getFinanceHealth } from '../features/finance/api/get-finance-health';
import { getStatement } from '../features/finance/api/get-statement';
import type {
  AdminFinanceHealthResponse,
  AdminHistoryItem,
  AdminStatementItem,
} from '../types/finance';

export const useAdminStore = () => {
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [statementItems, setStatementItems] = useState<AdminStatementItem[]>([]);
  const [historyItems] = useState<AdminHistoryItem[]>([]);
  const [financeHealth, setFinanceHealth] = useState<AdminFinanceHealthResponse>({
    ok: false,
    provider: 'unconfigured',
    message: 'Financeiro ainda não carregado.',
  });

  const openStatement = async () => {
    const [statement, health] = await Promise.all([getStatement(), getFinanceHealth()]);
    setStatementItems(statement.items ?? []);
    setFinanceHealth(health);
    setIsStatementOpen(true);
  };

  const openHistory = () => setIsHistoryOpen(true);
  const closeStatement = () => setIsStatementOpen(false);
  const closeHistory = () => setIsHistoryOpen(false);

  return {
    bookings: [],
    historyItems,
    statementItems,
    financeHealth,
    isStatementOpen,
    isHistoryOpen,
    openStatement,
    openHistory,
    closeStatement,
    closeHistory,
  };
};
