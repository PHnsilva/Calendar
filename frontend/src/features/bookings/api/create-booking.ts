import { ApiError, apiClient } from "../../../lib/api-client";
import type { ServicoCreateResponse, ServicoRequest } from "../../../types/api";

const CREATE_BOOKING_TIMEOUT_MS = 25_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidCreateBookingResponse(value: unknown): value is ServicoCreateResponse {
  if (!isObject(value)) return false;
  if (typeof value.manageToken !== "string" || !value.manageToken.trim()) return false;
  if (!isObject(value.servico)) return false;
  return typeof value.servico.eventId === "string" && value.servico.eventId.trim().length > 0;
}

export async function createBooking(payload: ServicoRequest) {
  const response = await apiClient<ServicoCreateResponse>("/api/servicos", {
    method: "POST",
    body: payload,
    timeoutMs: CREATE_BOOKING_TIMEOUT_MS,
  });

  if (!isValidCreateBookingResponse(response)) {
    throw new ApiError("Resposta inesperada do servidor. Tente novamente.", 0, response, {
      method: "POST",
      url: "/api/servicos",
      code: "UNEXPECTED_RESPONSE",
      retryable: true,
    });
  }

  return response;
}
