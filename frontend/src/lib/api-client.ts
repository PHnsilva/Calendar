import { resolveApiBaseUrl } from "./env";
import { getStoredAdminWorkspaceHeaders } from "./storage";

export class ApiError extends Error {
  status: number;
  payload: unknown;
  code: string;
  method: string;
  url: string;

  constructor(
    message: string,
    status: number,
    payload: unknown,
    request: { method?: string; url?: string; code?: string } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.code = request.code
      ?? (
        typeof payload === "object" && payload !== null && "error" in payload
          ? String((payload as { error?: unknown }).error ?? "")
          : ""
      );
    this.method = request.method ?? "";
    this.url = request.url ?? "";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  adminToken?: string;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, resolveApiBaseUrl());

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isDevelopmentMode(): boolean {
  return typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
}

function logApiFailure(method: string, url: string, status: number | string, payload: unknown) {
  if (!isDevelopmentMode()) return;
  console.error("[api]", {
    method,
    url,
    status,
    payload: payload ?? null,
  });
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, query, adminToken, ...rest } = options;
  const method = String(rest.method ?? "GET").toUpperCase();
  const url = buildUrl(path, query);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(adminToken ? { "X-ADMIN-SESSION": adminToken } : {}),
        ...(adminToken ? getStoredAdminWorkspaceHeaders() : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const isTimeout = typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "AbortError";
    const message = isTimeout
      ? "A requisição demorou mais do que o esperado. Tente novamente."
      : "Nao foi possivel conectar ao servico agora.";
    const status = isTimeout ? 408 : 0;
    const code = isTimeout ? "TIMEOUT_ERROR" : "NETWORK_ERROR";
    logApiFailure(method, url, code, error);
    throw new ApiError(message, status, null, { method, url, code });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const fallbackMessage = `Nao foi possivel concluir esta acao agora (erro ${response.status}).`;
    const message =
      typeof payload === "string"
        ? payload
        : typeof payload === "object" && payload !== null && "message" in payload
          ? String((payload as { message?: unknown }).message ?? fallbackMessage)
          : fallbackMessage;
    logApiFailure(method, url, response.status, payload);
    throw new ApiError(message, response.status, payload, { method, url });
  }

  return payload as T;
}

export function apiGet<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
  return apiClient<T>(path, {
    ...options,
    method: "GET",
  });
}

export function apiPost<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) {
  return apiClient<T>(path, {
    ...options,
    method: "POST",
    body,
  });
}


export function apiDelete<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
  return apiClient<T>(path, {
    ...options,
    method: "DELETE",
  });
}
