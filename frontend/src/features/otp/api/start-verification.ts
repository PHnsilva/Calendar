import { ApiError, apiClient } from "../../../lib/api-client";
import { getAuthFlowErrorMessage } from "../../../lib/api-error-messages";
import { normalizePhone } from "../../../lib/authRole";
import type { VerifyStartResponse } from "../../../types/api";

export async function startVerification(payload: { token: string; phone: string }) {
  try {
    return await apiClient<VerifyStartResponse>("/api/verify/start", {
      method: "POST",
      body: { ...payload, phone: normalizePhone(payload.phone) },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError(getAuthFlowErrorMessage(error, { step: "start", audience: "client" }), error.status, error.payload, {
        code: error.code,
        retryable: error.retryable,
        field: error.field,
        method: error.method,
        url: error.url,
      });
    }
    throw error;
  }
}
