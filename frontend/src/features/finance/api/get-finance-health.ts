import type { AdminFinanceHealthResponse } from "../../../types/finance"

export const getFinanceHealth = async (): Promise<AdminFinanceHealthResponse> => ({
  ok: true,
  provider: "mock-admin-finance",
  message: "Extrato simulado para validação visual"
})
