export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | string;

export type ServicoResponse = {
  eventId: string;
  eventLink?: string;
  serviceType: string;
  start: string;
  end: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientCep?: string;
  clientStreet?: string;
  clientNeighborhood?: string;
  clientNumber?: string;
  clientComplement?: string;
  clientCity?: string;
  clientState?: string;
  clientAddressLine?: string;
  status: BookingStatus;
};

export type AdminDashboardSummaryResponse = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  otherBookings: number;
  totalAmountCents: number;
  totalBlocks: number;
};

export type AdminBulkCancelRequest = {
  eventIds: string[];
  reason?: string;
};

export type BookingFormValues = {
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
};
