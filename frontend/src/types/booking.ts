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

export type AdminBulkCancelRequest = {
  eventIds: string[];
  reason?: string;
};

export type AdminDashboardSummaryResponse = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  otherBookings: number;
  totalAmountCents: number;
  totalBlocks: number;
};
