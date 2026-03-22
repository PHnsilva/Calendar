import { API_BASE_URL } from "./env";
import { ApiError, type ApiErrorPayload } from "../types/api";

type Primitive = string | number | boolean | null | undefined;

type RequestQuery = Record<string, Primitive>;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  query?: RequestQuery;
  adminToken?: string;
  body?: BodyInit | object | null;
};

function buildUrl(path: string, query?: RequestQuery): string {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE_URL}${path}`);

  if (!query) {
    return url.toString();
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

function normalizeBody(body: ApiRequestOptions["body"]): BodyInit | null | undefined {
  if (body === null || body === undefined) {
    return body;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return body;
  }

  return JSON.stringify(body);
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { query, adminToken, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers ?? {});

  if (adminToken) {
    requestHeaders.set("X-ADMIN-TOKEN", adminToken);
  }

  const normalizedBody = normalizeBody(body);
  const hasJsonBody = normalizedBody !== undefined && normalizedBody !== null && typeof normalizedBody === "string";

  if (hasJsonBody && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: requestHeaders,
    body: normalizedBody as BodyInit | null | undefined,
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object"
        ? (payload as ApiErrorPayload)
        : undefined;

    const message =
      errorPayload?.message ??
      errorPayload?.error ??
      (typeof payload === "string" && payload.length > 0 ? payload : `HTTP ${response.status}`);

    throw new ApiError(response.status, message, errorPayload);
  }

  return payload as T;
}

export function apiGet<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
  return apiFetch<T>(path, {
    ...options,
    method: "GET",
  });
}

export function apiPost<T>(path: string, body?: ApiRequestOptions["body"], options?: Omit<ApiRequestOptions, "method" | "body">) {
  return apiFetch<T>(path, {
    ...options,
    method: "POST",
    body,
  });
}

export function apiDelete<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
  return apiFetch<T>(path, {
    ...options,
    method: "DELETE",
  });
}
