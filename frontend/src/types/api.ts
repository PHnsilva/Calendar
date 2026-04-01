export type ServicoRequest = {
  serviceType: string;
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
};

export type ServicoResponse = {
  eventId: string;
  eventLink: string;
  serviceType: string;
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
  clientAddressLine: string;
  status: string;
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

export type PublicBootstrapResponse = {
  timezone: string;
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
    statuses: string[];
  };
  verification: {
    otpTtlSeconds: number;
    otpResendAfterSeconds: number;
  };
  serviceArea: {
    allowedCities: string[];
    allowedStates: string[];
  };
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
  placeId: string;
  formatted: string;
  latitude: number;
  longitude: number;
  addressLine1: string;
  addressLine2?: string;
  street: string;
  houseNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  postcode: string;
};
