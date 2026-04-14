import type { ServicoRequest, ServicoResponse } from "./api";

export type BookingFormValues = {
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientCep: string;
  clientStreet: string;
  clientNeighborhood: string;
  clientNumber: string;
  clientComplement: string;
  clientCity: string;
  clientState: string;
};

export type BookingRecord = ServicoResponse;
export type BookingUpdatePayload = ServicoRequest;

export type AdminBulkCancelRequest = {
  eventIds: string[];
  reason?: string;
};

export type AdminDashboardSummaryResponse = {
  totalBookings?: number;
  totalRevenue?: number;
  byStatus?: Record<string, number>;
  byCity?: Record<string, number>;
};
