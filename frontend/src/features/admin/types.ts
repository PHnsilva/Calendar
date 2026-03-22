import type { AdminDashboardSummaryResponse, ServicoResponse } from "../../types/booking";

export type AdminFilters = {
  search: string;
  status: string;
  city: string;
  from: string;
  to: string;
};

export type AdminDashboardData = {
  summary: AdminDashboardSummaryResponse;
  bookings: ServicoResponse[];
};
