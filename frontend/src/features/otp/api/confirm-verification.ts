import { ApiError, apiClient } from "../../../lib/api-client";
import { getAuthFlowErrorMessage } from "../../../lib/api-error-messages";
import type { VerifyConfirmResponse } from "../../../types/api";

export async function confirmVerification(payload: { verificationId: string; code: string }) {
  try {
    return await apiClient<VerifyConfirmResponse>("/api/verify/confirm", {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError(getAuthFlowErrorMessage(error, { step: "confirm", audience: "client" }), error.status, error.payload, {
        code: error.code,
        method: error.method,
        url: error.url,
      });
    }
    throw error;
  }
}
