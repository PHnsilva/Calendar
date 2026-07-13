import { ApiError, apiClient } from "../../../lib/api-client";
import { getAuthFlowErrorMessage } from "../../../lib/api-error-messages";
import type { VerifyStartResponse } from "../../../types/api";

export async function resendVerification(payload: { verificationId: string }) {
  try {
    return await apiClient<VerifyStartResponse>("/api/verify/resend", {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError(getAuthFlowErrorMessage(error, { step: "resend", audience: "client" }), error.status, error.payload, {
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
