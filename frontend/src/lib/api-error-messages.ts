import { ApiError } from "./api-client";

type AuthMessageOptions = {
  step: "start" | "resend" | "confirm";
  audience: "admin" | "client" | "mixed";
};

function isDevelopmentMode(): boolean {
  return typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
}

function includesNormalized(value: string, term: string): boolean {
  return value.toLowerCase().includes(term.toLowerCase());
}

function getApiMessage(error: ApiError): string {
  return typeof error.message === "string" ? error.message.trim() : "";
}

function getRouteHint(_path: string): string {
  if (!isDevelopmentMode()) return "";
  return ` Confira a configuracao local e tente novamente.`;
}

function isExternalDeliveryFailure(error: ApiError): boolean {
  return error.status === 502 || error.code === "AUTH_DEPENDENCY_UNAVAILABLE" || error.code === "UPSTREAM_ERROR";
}

function isInvalidOrExpiredCode(error: ApiError): boolean {
  const message = getApiMessage(error);
  return error.status === 401
    || error.status === 403
    || includesNormalized(message, "codigo inval")
    || includesNormalized(message, "código invál")
    || includesNormalized(message, "codigo expir")
    || includesNormalized(message, "código expir");
}

function isInvalidPhone(error: ApiError): boolean {
  const message = getApiMessage(error);
  return error.code === "INVALID_PHONE"
    || includesNormalized(message, "telefone inval")
    || includesNormalized(message, "telefone vál")
    || includesNormalized(message, "telefone valid");
}

export function getAvailabilityErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message
      ? error.message
      : "Não foi possível carregar os horários agora.";
  }

  if (error.status === 0) {
    return "Nao foi possivel conectar ao servico de horarios. Tente novamente.";
  }

  if (error.status === 404) {
    return `Os horarios nao estao disponiveis nesta tela agora.${getRouteHint("/api/servicos/available")}`;
  }

  if (error.status === 400 || error.status === 422) {
    return "A data, a cidade ou a duração solicitada são inválidas para consultar horários.";
  }

  if (error.status === 408) {
    return "A busca por horários demorou mais do que o esperado. Tente novamente.";
  }

  if (error.status === 409) {
    return "Os horários mudaram durante a consulta. Atualize e tente novamente.";
  }

  if (error.status >= 500) {
    return "Nao foi possivel carregar os horarios agora. Tente novamente em instantes.";
  }

  return getApiMessage(error) || "Não foi possível carregar os horários agora.";
}

export function getAuthFlowErrorMessage(error: unknown, options: AuthMessageOptions): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message
      ? error.message
      : "Não foi possível concluir a confirmação agora.";
  }

  if (error.status === 0) {
    return "Nao foi possivel conectar ao servico de confirmacao. Tente novamente.";
  }

  if (error.status === 404) {
    const endpoint = options.audience === "admin"
      ? "/api/admin/auth"
      : options.audience === "client"
        ? "/api/recovery"
        : "/api/admin/auth ou /api/recovery";
    return `A confirmacao nao esta disponivel nesta tela agora.${getRouteHint(endpoint)}`;
  }

  if (options.step === "confirm" && isInvalidOrExpiredCode(error)) {
    return "Código inválido ou expirado.";
  }

  if ((options.step === "start" || options.step === "resend") && isInvalidPhone(error)) {
    return "Informe um telefone válido.";
  }

  if (options.step === "resend" && includesNormalized(getApiMessage(error), "aguarde")) {
    return "Aguarde alguns instantes antes de reenviar o código.";
  }

  if (options.audience === "admin" && options.step === "start" && (error.status === 401 || error.status === 403)) {
    return "Número não autorizado para acesso administrativo.";
  }

  if (options.audience !== "admin" && options.step === "start" && includesNormalized(getApiMessage(error), "acesso administrativo")) {
    return "Esse número usa acesso administrativo. Faça a confirmação pelo fluxo de admin.";
  }

  if (isExternalDeliveryFailure(error)) {
    if (options.step === "confirm") {
      return "Não foi possível validar o código agora porque um serviço externo está indisponível.";
    }
    return "Não foi possível enviar o código por SMS ou WhatsApp agora. Tente novamente em instantes.";
  }

  if (error.status === 400 || error.status === 422) {
    return options.step === "confirm"
      ? "Não foi possível validar o código informado."
      : "Não foi possível iniciar a confirmação com os dados informados.";
  }

  if (error.status === 409) {
    return "Já existe uma solicitação ativa para esse telefone. Atualize o código e tente novamente.";
  }

  if (error.status >= 500) {
    return "O serviço de confirmação está temporariamente indisponível. Tente novamente em instantes.";
  }

  return getApiMessage(error) || "Não foi possível concluir a confirmação agora.";
}
