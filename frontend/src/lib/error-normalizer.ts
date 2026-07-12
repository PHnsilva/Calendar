export type ErrorContext =
  | "generic"
  | "login"
  | "verification"
  | "recovery"
  | "createBooking"
  | "editBooking"
  | "cancelBooking"
  | "bookingDetails"
  | "availability"
  | "calendar"
  | "address"
  | "route"
  | "profile"
  | "admin"
  | "finance"
  | "budget";

export type NormalizeErrorOptions = {
  context?: ErrorContext;
  fallbackMessage?: string;
};

export type NormalizedApiError = {
  code: string;
  message: string;
  retryable: boolean;
  status: number;
  field?: string;
};

type ApiErrorPayload = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
  retryable?: unknown;
  status?: unknown;
  field?: unknown;
};

const GENERIC_RETRY_MESSAGE = "Algo deu errado ao concluir a ação. Tente novamente.";
const DEPENDENCY_RETRY_MESSAGE = "Não foi possível concluir agora. Tente novamente em alguns instantes.";
const NETWORK_MESSAGE = "Verifique sua conexão e tente novamente.";

const CODE_MESSAGES: Record<string, string> = {
  ACCESS_LINK_INVALID: "Não foi possível validar seu acesso. Abra o link novamente para continuar.",
  ADMIN_ACCESS_NOT_ALLOWED: "Esse número não tem acesso liberado.",
  ADDRESS_LOOKUP_UNAVAILABLE: "Não foi possível buscar o endereço agora. Confira os dados e tente novamente.",
  ADDRESS_NOT_FOUND: "Não encontramos esse CEP. Revise o número e tente novamente.",
  AVAILABILITY_BLOCK_CONFLICT: "Existem agendamentos nesse período. Revise a prévia antes de bloquear.",
  BOOKING_ALREADY_COMPLETED: "Esse agendamento já foi concluído.",
  BOOKING_INVALID_DATE: "Escolha uma data válida para continuar.",
  BOOKING_INVALID_TIME: "Escolha um horário válido para continuar.",
  BOOKING_NOT_FOUND: "Não encontramos esse agendamento. Confira se ele ainda está disponível.",
  BOOKING_SLOT_UNAVAILABLE: "Esse horário acabou de ficar indisponível. Escolha outro horário.",
  CALENDAR_UNAVAILABLE: "Não foi possível consultar a agenda agora. Tente novamente em instantes.",
  CITY_NOT_SUPPORTED: "Ainda não atendemos essa cidade. Escolha uma das cidades disponíveis.",
  CONFLICT: "Não foi possível concluir porque os dados mudaram. Atualize e tente novamente.",
  DEPENDENCY_TIMEOUT: DEPENDENCY_RETRY_MESSAGE,
  DEPENDENCY_UNAVAILABLE: DEPENDENCY_RETRY_MESSAGE,
  FEATURE_UNAVAILABLE: "Esta função não está disponível agora.",
  FINANCE_UNAVAILABLE: "Não foi possível carregar as informações financeiras agora. Tente novamente.",
  FORBIDDEN: "Você não tem permissão para realizar essa ação.",
  INVALID_CEP: "Informe um CEP com 8 números.",
  INVALID_ADMIN_PASSWORD: "Senha incorreta. Confira e tente novamente.",
  INVALID_PARAM: "Revise os dados informados e tente novamente.",
  INVALID_PHONE: "Informe um celular válido com DDD.",
  INVALID_REQUEST_BODY: "Revise os dados enviados e tente novamente.",
  NETWORK_ERROR: NETWORK_MESSAGE,
  NOT_FOUND: "Não encontramos o registro solicitado.",
  PERMISSION_DENIED: "Você não tem permissão para realizar essa ação.",
  RATE_LIMITED: "Aguarde alguns instantes e tente novamente.",
  RESERVED_ACCESS: "Esse número usa uma área de acesso diferente. Entre pela área correta para continuar.",
  ROUTE_UNAVAILABLE: "Não foi possível calcular a rota agora. Tente novamente em instantes.",
  SESSION_EXPIRED: "Sua sessão expirou. Entre novamente para continuar.",
  TOO_MANY_REQUESTS: "Aguarde alguns instantes e tente novamente.",
  UNEXPECTED_ERROR: GENERIC_RETRY_MESSAGE,
  VALIDATION_ERROR: "Revise os dados informados e tente novamente.",
  VERIFICATION_CODE_INVALID: "Código inválido ou expirado. Confira os dígitos e tente novamente.",
  VERIFICATION_DELIVERY_FAILED: "Não conseguimos enviar o código agora. Confira o número e tente novamente.",
  VERIFICATION_DELIVERY_LIMIT: "Não conseguimos enviar o código agora. Tente novamente mais tarde.",
  VERIFICATION_RESEND_WAIT: "Aguarde alguns instantes antes de reenviar o código.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Revise os dados informados e tente novamente.",
  401: "Sua sessão expirou. Entre novamente para continuar.",
  403: "Você não tem permissão para realizar essa ação.",
  404: "Não encontramos o registro solicitado.",
  408: NETWORK_MESSAGE,
  409: "Não foi possível concluir porque os dados mudaram. Atualize e tente novamente.",
  422: "Revise os dados informados e tente novamente.",
  429: "Aguarde alguns instantes e tente novamente.",
  500: GENERIC_RETRY_MESSAGE,
  502: DEPENDENCY_RETRY_MESSAGE,
  503: DEPENDENCY_RETRY_MESSAGE,
  504: DEPENDENCY_RETRY_MESSAGE,
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function getPayload(error: unknown): ApiErrorPayload | null {
  const object = asObject(error);
  const payload = asObject(object?.payload);
  if (payload) return payload as ApiErrorPayload;
  return object as ApiErrorPayload | null;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function isUnsafeCustomerMessage(message: string): boolean {
  const normalized = normalizeText(message);
  return normalized.includes("supabase")
    || normalized.includes("database")
    || normalized.includes("stack")
    || normalized.includes("exception")
    || normalized.includes("upstream")
    || normalized.includes("dns")
    || normalized.includes("jwt")
    || normalized.includes("token")
    || normalized.includes("internal server error")
    || normalized.includes("sql")
    || normalized.includes("failed to fetch")
    || normalized.includes("timeout")
    || normalized.includes("api key")
    || normalized.includes("apikey")
    || normalized.includes("oauth")
    || normalized.includes("access_token")
    || normalized.includes("backend")
    || normalized.includes("geoapify")
    || normalized.includes("google routes")
    || normalized.includes("provedor")
    || normalized.includes("provider")
    || normalized.includes("servico externo")
    || normalized.includes("serviço externo")
    || normalized.includes("dependencia")
    || normalized.includes("dependência")
    || normalized.includes("trace")
    || /\berro\s+\d{3}\b/.test(normalized);
}

function isGenericHttpMessage(message: string): boolean {
  const normalized = normalizeText(message);
  return [
    "bad request",
    "unauthorized",
    "forbidden",
    "not found",
    "request timeout",
    "conflict",
    "unprocessable entity",
    "too many requests",
    "internal server error",
    "bad gateway",
    "service unavailable",
    "gateway timeout",
  ].includes(normalized);
}

function isTechnicalCode(code: string): boolean {
  const normalized = normalizeText(code);
  return normalized.includes("supabase")
    || normalized.includes("upstream")
    || normalized.includes("dns")
    || normalized.includes("jwt")
    || normalized.includes("sql")
    || normalized.includes("database")
    || normalized.includes("timeout")
    || normalized.includes("provider")
    || normalized.includes("auth_failed");
}

function safeCode(candidate: string, status: number): string {
  const normalized = candidate.trim().toUpperCase();
  if (!normalized || !/^[A-Z0-9_]+$/.test(normalized)) return codeFromStatus(status);
  if (isTechnicalCode(normalized)) return normalized.includes("TIMEOUT") ? "DEPENDENCY_TIMEOUT" : "DEPENDENCY_UNAVAILABLE";
  if (normalized === "UPSTREAM_ERROR" || normalized === "PROVIDER_UNAVAILABLE") return "DEPENDENCY_UNAVAILABLE";
  if (normalized === "INTERNAL_ERROR") return "UNEXPECTED_ERROR";
  if (normalized === "AUTH_FAILED") return "SESSION_EXPIRED";
  return normalized;
}

export function extractApiErrorCode(errorOrPayload: unknown, status = 0): string {
  const object = asObject(errorOrPayload);
  const payload = getPayload(errorOrPayload) ?? object;
  const direct = getString(object?.code);
  const payloadCode = getString(payload?.code);
  const legacyError = getString(payload?.error);
  return safeCode(direct || payloadCode || legacyError, status);
}

export function extractApiErrorField(errorOrPayload: unknown): string | undefined {
  const object = asObject(errorOrPayload);
  const payload = getPayload(errorOrPayload) ?? object;
  return getString(object?.field) || getString(payload?.field) || undefined;
}

export function extractApiErrorRetryable(errorOrPayload: unknown, status = 0): boolean {
  const object = asObject(errorOrPayload);
  const payload = getPayload(errorOrPayload) ?? object;
  const explicit = getBoolean(object?.retryable) ?? getBoolean(payload?.retryable);
  if (explicit !== undefined) return explicit;
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

function statusFromError(error: unknown): number {
  const object = asObject(error);
  const payload = getPayload(error);
  const value = object?.status ?? payload?.status;
  return value === undefined || value === null || value === "" ? -1 : getNumber(value);
}

function rawMessageFromError(error: unknown): string {
  const object = asObject(error);
  const payload = getPayload(error);
  return getString(payload?.message) || getString(object?.message);
}

function codeFromStatus(status: number): string {
  if (status === 0) return "NETWORK_ERROR";
  if (status === 401) return "SESSION_EXPIRED";
  if (status === 403) return "PERMISSION_DENIED";
  if (status === 404) return "NOT_FOUND";
  if (status === 408) return "NETWORK_ERROR";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "TOO_MANY_REQUESTS";
  if (status >= 500) return "UNEXPECTED_ERROR";
  return "UNEXPECTED_ERROR";
}

function contextMessage(context: ErrorContext): string {
  switch (context) {
    case "login":
      return "Não foi possível entrar agora. Confira os dados e tente novamente.";
    case "verification":
    case "recovery":
    case "profile":
      return "Não conseguimos enviar ou confirmar o código agora. Tente novamente.";
    case "createBooking":
      return "Não foi possível concluir o agendamento agora. Tente novamente.";
    case "editBooking":
      return "Não foi possível salvar a alteração. Tente novamente.";
    case "cancelBooking":
      return "Não foi possível cancelar esse atendimento. Tente novamente.";
    case "bookingDetails":
      return "Não foi possível carregar os detalhes desse atendimento. Tente novamente.";
    case "availability":
    case "calendar":
      return "Não foi possível carregar os horários agora. Tente novamente em instantes.";
    case "address":
      return "Não foi possível buscar o endereço agora. Confira os dados e tente novamente.";
    case "route":
      return "Não foi possível calcular a rota agora. Tente novamente em instantes.";
    case "admin":
      return "Não foi possível concluir a ação. Tente novamente.";
    case "finance":
      return "Não foi possível carregar as informações financeiras agora. Tente novamente.";
    case "budget":
      return "Não foi possível salvar o orçamento no navegador.";
    default:
      return GENERIC_RETRY_MESSAGE;
  }
}

function messageFromStatus(status: number, context: ErrorContext): string {
  if (status === 0) return NETWORK_MESSAGE;
  if (status < 0) return contextMessage(context);
  if (status >= 500) return contextMessage(context);
  return STATUS_MESSAGES[status] ?? contextMessage(context);
}

function messageFromCode(code: string, status: number, context: ErrorContext): string {
  if (code === "CONFLICT" && (context === "createBooking" || context === "editBooking" || context === "availability")) {
    return CODE_MESSAGES.BOOKING_SLOT_UNAVAILABLE;
  }
  if (code === "NOT_FOUND" && ["bookingDetails", "editBooking", "cancelBooking"].includes(context)) {
    return CODE_MESSAGES.BOOKING_NOT_FOUND;
  }
  return CODE_MESSAGES[code] ?? messageFromStatus(status, context);
}

export function normalizeApiError(error: unknown, options: NormalizeErrorOptions = {}): NormalizedApiError {
  const context = options.context ?? "generic";
  const status = statusFromError(error);
  const rawMessage = rawMessageFromError(error);
  const code = extractApiErrorCode(error, status);
  const retryable = extractApiErrorRetryable(error, status);
  const field = extractApiErrorField(error);
  const fallback = options.fallbackMessage ?? messageFromCode(code, status, context);

  const message = rawMessage && !isUnsafeCustomerMessage(rawMessage) && !isGenericHttpMessage(rawMessage)
    ? rawMessage
    : fallback;

  return {
    code,
    message: message || contextMessage(context),
    retryable,
    status,
    field,
  };
}

export function normalizeApiErrorMessage(error: unknown, options: NormalizeErrorOptions = {}): string {
  return normalizeApiError(error, options).message;
}
