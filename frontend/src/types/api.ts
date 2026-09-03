export type ServicoRequest = {
  serviceType: string;
  serviceNotes?: string;
  date: string;
  time: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientCep: string;
  clientStreet: string;
  clientNeighborhood: string;
  clientNumber: string;
  clientComplement?: string;
  clientCity: string;
  clientState: string;
  clientLatitude?: number;
  clientLongitude?: number;
  reservedPhonePassword?: string;
};

export type AdminServicoUpdateRequest = Omit<ServicoRequest, 'clientLastName' | 'reservedPhonePassword'> & {
  serviceNotes?: string;
};

export type ServicoResponse = {
  eventId: string;
  eventLink: string;
  serviceType: string;
  serviceNotes: string;
  start: string;
  end: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientCep: string;
  clientStreet: string;
  clientNeighborhood: string;
  clientNumber: string;
  clientComplement?: string;
  clientCity: string;
  clientState: string;
  clientLatitude?: number;
  clientLongitude?: number;
  clientAddressLine: string;
  status: string;
  cancellationAt?: string;
  cancellationSource?: string;
  manageToken?: string;
  assignedProviderId?: string;
  assignedProviderName?: string;
  assignedProviderPhone?: string;
};

export type ServicoCreateResponse = {
  servico: ServicoResponse;
  manageToken: string;
  verificationId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  pendingExpiresAt: string;
};

export type VerifyStartResponse = {
  verificationId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export type VerifyConfirmResponse = {
  verified: boolean;
};

export type RecoverStartResponse = {
  verificationId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export type RecoverConfirmResponse = {
  verified: boolean;
  servicos: ServicoResponse[];
};

export type PublicBootstrapResponse = {
  timezone: string;
  services: string[];
  schedule: {
    cycleStart: string | null;
    workStart: string;
    workEnd: string;
    lunchStart: string;
    lunchEnd: string;
  };
  booking: {
    slotMinutes: number;
    allowedMinuteMarks: number[];
    maxFutureMonthsAhead: number;
    pendingTtlSeconds: number;
    blockOtherBookingsWhenPending: boolean;
    cancellationNoticeHours: number;
    statuses: string[];
  };
  verification: {
    otpTtlSeconds: number;
    otpResendAfterSeconds: number;
    deliveryChannel?: string;
    webOtpEnabled?: boolean;
  };
  serviceArea: {
    allowedCities: string[];
    allowedStates: string[];
    durationByCity?: Record<string, number>;
  };
};

export type PublicBookingResponse = {
  eventId: string;
  serviceType: string;
  start: string;
  status: string;
};

export type CepLookupResponse = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
};

export type GeoapifyAddressSuggestion = {
  id: string;
  label: string;
  placeId: string;
  formatted: string;
  latitude: number;
  longitude: number;
  lat: number;
  lon: number;
  addressLine1: string;
  addressLine2?: string;
  street: string;
  houseNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  postcode: string;
  raw?: Record<string, unknown>;
};

export type GeoapifyCityContext = {
  name: string;
  state?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  raw?: Record<string, unknown>;
};

export type AdminDashboardSummaryResponse = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  otherBookings: number;
  totalAmountCents: number;
  totalBlocks: number;
};

export type AvailabilityConflictItem = {
  eventId: string;
  serviceType: string;
  start: string;
  end: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientCity: string;
  status: string;
};

export type AvailabilityBlockResponse = {
  blockId: string;
  mode: string;
  type: string;
  start: string;
  end: string;
  reason?: string;
  createdAt?: string;
};

export type AvailabilityBlockPreviewResponse = {
  mode: string;
  type: string;
  start: string;
  end: string;
  reason?: string;
  conflictCount: number;
  conflicts: AvailabilityConflictItem[];
};

export type AdminRole = "OWNER" | "PROVIDER";
export type AdminWorkspaceMode = "ADMIN" | "PROVIDER";

export type AdminWorkspaceContext = {
  mode: AdminWorkspaceMode;
  providerId?: string;
  providerName?: string;
  impersonatedByOwner?: boolean;
};

export type AdminMeResponse = {
  id: string;
  name: string;
  phone: string;
  role: AdminRole;
  permissions: string[];
  sessionExpiresAt: number;
};

export type AdminAuthStartResponse = {
  verificationId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export type AdminAuthConfirmResponse = {
  sessionToken: string;
  admin: AdminMeResponse;
};

export type AdminProviderResponse = {
  id: string;
  name: string;
  phone: string;
  role: AdminRole;
};
