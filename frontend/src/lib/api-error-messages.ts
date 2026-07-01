import { ApiError } from "./api-client";
import { normalizeApiErrorMessage, type ErrorContext } from "./error-normalizer";

type AuthMessageOptions = {
  step: "start" | "resend" | "confirm";
  audience: "admin" | "client" | "mixed";
};

export function getAvailabilityErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "Os horários não estão disponíveis agora. Tente novamente em instantes.";
  }

  return normalizeApiErrorMessage(error, {
    context: "availability",
    fallbackMessage: "Não foi possível carregar os horários agora. Tente novamente em instantes.",
  });
}

export function getAuthFlowErrorMessage(error: unknown, options: AuthMessageOptions): string {
  const context: ErrorContext = options.audience === "admin" ? "login" : "verification";

  if (error instanceof ApiError) {
    if ((options.step === "start" || options.step === "resend") && error.code === "INVALID_PHONE") {
      return "Informe um celular válido com DDD.";
    }

    if (options.step === "confirm" && ["VERIFICATION_CODE_INVALID", "VALIDATION_ERROR"].includes(error.code)) {
      return "Código inválido ou expirado. Confira os dígitos e tente novamente.";
    }

    if (options.step === "resend" && ["VERIFICATION_RESEND_WAIT", "TOO_MANY_REQUESTS"].includes(error.code)) {
      return "Aguarde alguns instantes antes de reenviar o código.";
    }

    if (options.audience === "admin" && options.step === "start" && ["PERMISSION_DENIED", "FORBIDDEN"].includes(error.code)) {
      return "Esse número não tem acesso liberado.";
    }

    if (["VERIFICATION_DELIVERY_FAILED", "VERIFICATION_DELIVERY_LIMIT"].includes(error.code)) {
      return "Não conseguimos enviar o código agora. Confira o número e tente novamente.";
    }
  }

  return normalizeApiErrorMessage(error, {
    context,
    fallbackMessage: options.step === "confirm"
      ? "Não foi possível validar o código agora. Tente novamente."
      : "Não conseguimos enviar o código agora. Confira o número e tente novamente.",
  });
}
