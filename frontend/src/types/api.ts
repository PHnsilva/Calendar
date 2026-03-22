export type ApiErrorPayload = {
  code?: string;
  error?: string;
  message?: string;
  status?: number;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly payload?: ApiErrorPayload;

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

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
